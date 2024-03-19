import type { Browser } from 'puppeteer'
import type {
    ConvertedItemPayload,
    ParsedScrapeInstructions,
    PushAnalyticsEnvVariables,
    QueueItem,
} from '../types'
import { AppScraper } from './AppScraper'
import { ItemParser } from './ItemParser'
import { PushAnalyticsError } from '../Error'

const SCRAPABLE_DASHBOARD_ITEM_TYPES = new Set([
    'VISUALIZATION',
    'EVENT_VISUALIZATION',
    'EVENT_CHART',
    'EVENT_REPORT',
    'MAP',
])

const PARSABLE_DASHBOARD_ITEM_TYPES = new Set([
    'REPORTS',
    'RESOURCES',
    'TEXT',
    /* TODO: add support for scraping apps once there is
     * a generic way to link a dashboard-item to an app-URL */
    'APP',
    'MESSAGES',
    'USERS',
])

class DashboardItemConverterError extends PushAnalyticsError {
    constructor(
        message: string,
        errorCode: string = 'E2401',
        httpResponseStatusCode: number = 500
    ) {
        super(message, errorCode, httpResponseStatusCode)
    }
}

export class DashboardItemConverter {
    #env: PushAnalyticsEnvVariables
    #conversionInProgress: boolean
    #appScraper: AppScraper
    #itemParser: ItemParser

    private constructor(
        env: PushAnalyticsEnvVariables,
        appScraper: AppScraper,
        itemParser: ItemParser
    ) {
        this.#env = env
        this.#conversionInProgress = false
        this.#appScraper = appScraper
        this.#itemParser = itemParser
    }

    static async create(env: PushAnalyticsEnvVariables, browser: Browser) {
        const appScraper = await AppScraper.create(env.baseUrl, browser)
        const itemParser = new ItemParser(env.baseUrl)
        return new DashboardItemConverter(env, appScraper, itemParser)
    }

    public isConverting() {
        return this.#conversionInProgress
    }

    public async convert(
        queueItem: QueueItem,
        config?: ParsedScrapeInstructions
    ): Promise<ConvertedItemPayload> {
        this.#conversionInProgress = true
        const result = await this.#convertItemType(queueItem, config)

        return {
            requestId: queueItem.requestId,
            dashboardId: queueItem.dashboardId,
            username: queueItem.username,
            dashboardItemId: queueItem.dashboardItem.id,
            html: typeof result === 'string' ? result : result.html,
            css: typeof result === 'string' ? '' : result.css,
        }
    }

    public isAppScraperConversion(queueItem: QueueItem) {
        if (SCRAPABLE_DASHBOARD_ITEM_TYPES.has(queueItem.dashboardItem.type)) {
            return true
        } else if (PARSABLE_DASHBOARD_ITEM_TYPES) {
            return false
        } else {
            throw new DashboardItemConverterError(
                `Encountered unknown dashboard item type ${queueItem.dashboardItem.type}`
            )
        }
    }

    async #convertItemType(queueItem: QueueItem, config?: ParsedScrapeInstructions) {
        this.#conversionInProgress = true
        try {
            const result = this.isAppScraperConversion(queueItem)
                ? await this.#appScraper.convert(
                      queueItem,
                      config as ParsedScrapeInstructions
                  )
                : await this.#itemParser.convert(queueItem)
            return result
        } catch (error) {
            if (
                this.isAppScraperConversion(queueItem) &&
                this.#env.context === 'development'
            ) {
                try {
                    await this.#appScraper.takeErrorScreenShot(queueItem)
                } catch (error) {
                    /* Note that the error below is swallowed because the service
                     * should not crash when a debug tool fails to work properly */
                    console.log(
                        `Error screenshot failed for item-id "${queueItem.dashboardItem.id}"`
                    )
                }
            }

            throw error
        } finally {
            this.#conversionInProgress = false
        }
    }
}
