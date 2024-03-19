import { PushAnalyticsError } from '../Error'
import type {
    ConversionErrorPayload,
    ConvertedItemPayload,
    PushAnalyticsEnvVariables,
    QueueItem,
} from '../types'
import { createPuppeteerBrowser } from './AppScraperUtils'
import { Authenticator } from './Authenticator'
import { DashboardItemConverter } from './DashboardItemConverter'
import { ScrapeConfigCache } from './ScrapeConfigCache'
import { WorkerProcessMessageHandler } from './WorkerProcessMessageHandler'

class WorkerProcessError extends PushAnalyticsError {
    constructor(
        message: string,
        errorCode: string = 'E2101',
        httpResponseStatusCode: number = 500
    ) {
        super(message, errorCode, httpResponseStatusCode)
    }
}

export class WorkerProcess {
    #messageHandler: WorkerProcessMessageHandler
    #converter: DashboardItemConverter
    #authenticator: Authenticator
    #configCache: ScrapeConfigCache

    private constructor(
        converter: DashboardItemConverter,
        authenticator: Authenticator,
        configCache: ScrapeConfigCache
    ) {
        this.#converter = converter
        this.#authenticator = authenticator
        this.#configCache = configCache
        this.#messageHandler = new WorkerProcessMessageHandler({
            onItemsAddedToQueue: this.#handleItemsAddedToQueue.bind(this),
            onItemTakenFromQueue: this.#handleItemTakenFromQueue.bind(this),
        })
        // See if there is work to do
        this.#messageHandler.requestDashboardItemFromQueue()
    }

    static async create(env: PushAnalyticsEnvVariables, debug: boolean) {
        const browser = await createPuppeteerBrowser(debug)
        const converter = await DashboardItemConverter.create(env, browser)
        const authenticator = await Authenticator.create(env, browser, converter)
        const configCache = new ScrapeConfigCache(env.baseUrl, authenticator)
        await authenticator.establishNonExpiringAdminSession()
        return new WorkerProcess(converter, authenticator, configCache)
    }

    #handleItemsAddedToQueue() {
        // Ignore this event if still converting
        if (!this.#converter.isConverting()) {
            this.#messageHandler.requestDashboardItemFromQueue()
        }
    }

    async #handleItemTakenFromQueue(queueItem: QueueItem) {
        if (this.#converter.isConverting()) {
            throw new WorkerProcessError(
                'Received a queueItem while converting, this should not happen'
            )
        }

        try {
            let config = undefined
            if (this.#converter.isAppScraperConversion(queueItem)) {
                config = await this.#configCache.getScrapeConfig(queueItem.dashboardItem)
                await this.#authenticator.impersonateUser(queueItem.username)
            }
            const convertedItem: ConvertedItemPayload = await this.#converter.convert(
                queueItem,
                config
            )
            this.#messageHandler.sendConvertedItemToPrimaryProcess(convertedItem)
        } catch (error) {
            let errorMessage = 'Internal error'
            let errorName = 'UnknownConversionError'
            let errorCode = 'E2000'
            let httpResponseStatusCode = 500

            if (error instanceof PushAnalyticsError) {
                errorMessage = error.message
                errorName = error.name
                errorCode = error.errorCode
                httpResponseStatusCode = error.httpResponseStatusCode
            } else if (error instanceof Error) {
                errorMessage = error.message
            }

            const conversionError: ConversionErrorPayload = {
                requestId: queueItem.requestId,
                dashboardId: queueItem.dashboardId,
                username: queueItem.username,
                dashboardItemId: queueItem.dashboardItem.id,
                errorMessage,
                errorName,
                errorCode,
                httpResponseStatusCode,
            }
            this.#messageHandler.sendItemConversionErrorToPrimaryProcess(conversionError)
        } finally {
            // See if there is more work to do
            this.#messageHandler.requestDashboardItemFromQueue()
        }
    }
}
