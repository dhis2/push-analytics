import type {
    ConversionError,
    ConvertedItem,
    PushAnalyticsEnvVariables,
    QueueItem,
} from '../types'
import { createPuppeteerBrowser } from '../utils'
import { Authenticator } from './Authenticator'
import { DashboardItemConverter } from './DashboardItemConverter'
import { ScrapeConfigCache } from './ScrapeConfigCache'
import { WorkerProcessMessageHandler } from './WorkerProcessMessageHandler'

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
        const authenticator = await Authenticator.create(
            env,
            browser,
            converter
        )
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
            throw new Error(
                'Received a queueItem while converting, this should not happen'
            )
        }

        try {
            let config = undefined
            if (this.#converter.isAppScraperConversion(queueItem)) {
                config = await this.#configCache.getScrapeConfig(
                    queueItem.dashboardItem
                )
                await this.#authenticator.impersonateUser(queueItem.username)
            }
            const convertedItem: ConvertedItem = await this.#converter.convert(
                queueItem,
                config
            )
            this.#messageHandler.sendConvertedItemToPrimaryProcess(
                convertedItem
            )
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Conversion error'
            const conversionError: ConversionError = {
                requestId: queueItem.requestId,
                dashboardId: queueItem.dashboardId,
                username: queueItem.username,
                dashboardItemId: queueItem.dashboardItem.id,
                errorMessage,
            }
            this.#messageHandler.sendItemConversionErrorToPrimaryProcess(
                conversionError
            )
        } finally {
            // See if there is more work to do
            this.#messageHandler.requestDashboardItemFromQueue()
        }
    }
}
