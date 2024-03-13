import process from 'node:process'
import puppeteer, { Browser, PuppeteerLaunchOptions } from 'puppeteer'
import { insertIntoConversionErrorTemplate } from '../templates'
import type { ConvertedItem, DashboardItemType, QueueItem } from '../types'
import { PushAnalyticsEnvVariables } from '../utils'
import { AppScraper } from './AppScraper'
import { Authenticator } from './Authenticator'
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
    #debug: boolean
    #baseUrl: string
    #apiVersion: string
    #adminUsername: string
    #adminPassword: string
    #sessionTimeout: string
    #browser: Browser | null
    #authenticator: Authenticator | null
    #appScraper: AppScraper
    #itemParser: ItemParser

    constructor(env: PushAnalyticsEnvVariables, debug: boolean) {
        this.#conversionInProgress = false
        this.#baseUrl = env.baseUrl
        this.#apiVersion = env.apiVersion
        this.#adminUsername = env.adminUsername
        this.#adminPassword = env.adminPassword
        this.#sessionTimeout = env.sessionTimeout
        this.#debug = debug
        this.#browser = null
        this.#authenticator = null
        this.#appScraper = new AppScraper(env.baseUrl)
        this.#itemParser = new ItemParser(env.baseUrl)
    }

    get browser() {
        if (!this.#browser) {
            throw new Error('Browser has not been initialized')
        } else {
            return this.#browser
        }
    }

    get isConverting() {
        /* This is a hack to avoid the following error:
         * `Cannot read private member from an object whose class did not declare it`
         * This approach has been chosen because the `#conversionInProgress` property
         * is a primitive/boolean, so it cannot be passed to other classes to read the
         * current conversion status. Instead we need to pass a method that reads the
         * current status and returns it. However, when implementing this public method
         * in the expected way `isConverting() { return this.#conversionInProgress }`,
         * the error above is thrown. This getter that returns a function and works as
         * expected and does not cause errors. */
        return () => this.#conversionInProgress
    }

    public async convert(queueItem: QueueItem): Promise<ConvertedItem> {
        if (!process?.send) {
            throw new Error('Cannont send message from worker to main thread')
        }

        const result = await this.#convertItemType(queueItem)

        return {
            requestId: queueItem.requestId,
            dashboardId: queueItem.dashboardId,
            username: queueItem.username,
            dashboardItemId: queueItem.dashboardItem.id,
            html: typeof result === 'string' ? result : result.html,
            css: typeof result === 'string' ? '' : result.css,
        }
    }

    public async init() {
        this.#browser = await this.#createBrowser()
        const [firstBlankPage] = await this.#browser.pages()
        this.#authenticator = new Authenticator({
            page: firstBlankPage,
            baseUrl: this.#baseUrl,
            apiVersion: this.#apiVersion,
            adminUsername: this.#adminUsername,
            adminPassword: this.#adminPassword,
            sessionTimeout: this.#sessionTimeout,
            isConverting: this.isConverting,
        })
        await this.#authenticator.establishNonExpiringAdminSession()
        // Init appScraper once the browser instance is available
        await this.#appScraper.init(this.#browser, this.#authenticator)
    }

    async #convertItemType(queueItem: QueueItem) {
        if (!this.#authenticator) {
            throw new Error('Authenticator not initialized')
        }
        this.#conversionInProgress = true
        const itemTypeConverter = this.#getConverterForItemType(
            queueItem.dashboardItem.type
        )
        try {
            await this.#authenticator.impersonateUser(queueItem.username)
            const result = await itemTypeConverter.convert(queueItem)
            return result
        } catch (error) {
            // TODO: skip in production too?
            if (itemTypeConverter instanceof AppScraper) {
                try {
                    await itemTypeConverter.takeErrorScreenShot(queueItem)
                } catch (error) {
                    console.log(
                        `Error screenshot failed for item-id "${queueItem.dashboardItem.id}"`
                    )
                }
            }

            console.log(
                `Conversion failed for dashboard-id ${queueItem.dashboardId} item-id "${queueItem.dashboardItem.id}" of type "${queueItem.dashboardItem.type}" on worker with PID "${process.pid}"`
            )

            return Promise.resolve(
                insertIntoConversionErrorTemplate(queueItem, error)
            )
        } finally {
            this.#conversionInProgress = false
        }
    }

    #getConverterForItemType(dashboardItemType: DashboardItemType) {
        if (SCRAPABLE_DASHBOARD_ITEM_TYPES.has(dashboardItemType)) {
            return this.#appScraper
        } else if (PARSABLE_DASHBOARD_ITEM_TYPES) {
            return this.#itemParser
        } else {
            throw new Error(
                `Encountered unknown dashboard item type ${dashboardItemType}`
            )
        }
    }

    // TODO: should probably do this in the AppScraper
    async #createBrowser() {
        const defaultViewport = { width: 1280, height: 1000 }
        const browserOptions: PuppeteerLaunchOptions = this.#debug
            ? {
                  headless: false,
                  devtools: true,
                  defaultViewport,
                  args: ['--window-size=2560,2160', '--window-position=4000,0'],
                  /* Uncomment to add a delay between puppeteer steps
                   * making it easier to visually debug problems */
                  //   slowMo: 100,
              }
            : {
                  headless: 'new',
                  defaultViewport,
                  //   Required argument for dockerized puppeteer
                  //   args: ['--no-sandbox'],
              }
        const browser = await puppeteer.launch(browserOptions)
        return browser
    }
}
