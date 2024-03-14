import process from 'node:process'
import type { Browser } from 'puppeteer'
import type {
    ConvertedItem,
    ParsedScrapeInstructions,
    PushAnalyticsEnvVariables,
    QueueItem,
} from '../types'
import { AppScraper } from './AppScraper'
import { ItemParser } from './ItemParser'

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

export class DashboardItemConverter {
    #conversionInProgress: boolean
    #appScraper: AppScraper
    #itemParser: ItemParser

    private constructor(appScraper: AppScraper, itemParser: ItemParser) {
        this.#conversionInProgress = false
        this.#appScraper = appScraper
        this.#itemParser = itemParser
    }

    static async create(env: PushAnalyticsEnvVariables, browser: Browser) {
        const appScraper = await AppScraper.create(env.baseUrl, browser)
        const itemParser = new ItemParser(env.baseUrl)
        return new DashboardItemConverter(appScraper, itemParser)
    }

    public isConverting() {
        return this.#conversionInProgress
    }

    public async convert(
        queueItem: QueueItem,
        config?: ParsedScrapeInstructions
    ): Promise<ConvertedItem> {
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
            throw new Error(
                `Encountered unknown dashboard item type ${queueItem.dashboardItem.type}`
            )
        }
    }

    async #convertItemType(
        queueItem: QueueItem,
        config?: ParsedScrapeInstructions
    ) {
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
            // TODO: skip in production too?
            if (this.isAppScraperConversion(queueItem)) {
                try {
                    await this.#appScraper.takeErrorScreenShot(queueItem)
                } catch (error) {
                    console.log(
                        `Error screenshot failed for item-id "${queueItem.dashboardItem.id}"`
                    )
                }
            }

            throw new Error(
                `Conversion failed for dashboard-id ${queueItem.dashboardId} item-id "${queueItem.dashboardItem.id}" of type "${queueItem.dashboardItem.type}" on worker with PID "${process.pid}"`
            )
        } finally {
            this.#conversionInProgress = false
        }
    }
}
