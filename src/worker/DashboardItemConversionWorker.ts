import process from 'node:process'
import puppeteer, { Browser, PuppeteerLaunchOptions } from 'puppeteer'
import {
    AppScraper,
    ReportsParser,
    ResourcesParser,
    TextParser,
    UnsupportedTypeConverter,
} from '../converters'
import { insertIntoConversionErrorTemplate } from '../templates'
import type {
    ConversionRequestMessage,
    ConversionResultMessage,
    ConvertedItem,
    DashboardItemType,
    QueueItem,
    WorkerInitializedMessage,
} from '../types'
import { Authenticator } from './Authenticator'

type DashboardItemConversionWorkerOptions = {
    debug: boolean
    baseUrl: string
    apiVersion: string
    adminUsername: string
    adminPassword: string
    sessionTimeout: string
}

export class DashboardItemConversionWorker {
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
    #reportsParser: ReportsParser
    #resourcesParser: ResourcesParser
    #textParser: TextParser
    #unsupportedTypeConverter: UnsupportedTypeConverter

    constructor({
        baseUrl,
        apiVersion,
        debug,
        adminUsername,
        adminPassword,
        sessionTimeout,
    }: DashboardItemConversionWorkerOptions) {
        this.#conversionInProgress = false
        this.#baseUrl = baseUrl
        this.#apiVersion = apiVersion
        this.#adminUsername = adminUsername
        this.#adminPassword = adminPassword
        this.#sessionTimeout = sessionTimeout
        this.#debug = debug
        this.#browser = null
        this.#authenticator = null
        this.#appScraper = new AppScraper(baseUrl)
        this.#reportsParser = new ReportsParser(baseUrl)
        this.#resourcesParser = new ResourcesParser(baseUrl)
        this.#textParser = new TextParser()
        this.#unsupportedTypeConverter = new UnsupportedTypeConverter()
        this.#addConversionRequestListener()
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

    public async convert(queueItem: QueueItem) {
        if (!process?.send) {
            throw new Error('Cannont send message from worker to main thread')
        }

        const result = await this.#convertItemType(queueItem)

        return {
            dashboardId: queueItem.dashboardId,
            username: queueItem.username,
            dashboardItemId: queueItem.dashboardItem.id,
            html: typeof result === 'string' ? result : result.html,
            css: typeof result === 'string' ? '' : result.css,
        } as ConvertedItem
    }

    async init() {
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
        await this.#appScraper.init(this.#browser)

        this.#notifyMainProcess({
            type: 'WORKER_INITIALIZED',
        } as WorkerInitializedMessage)
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
        switch (dashboardItemType) {
            // return this.#visualizationScraper
            case 'VISUALIZATION':
            case 'EVENT_VISUALIZATION':
            case 'EVENT_CHART':
            case 'EVENT_REPORT':
            case 'MAP':
                return this.#appScraper
            case 'REPORTS':
                return this.#reportsParser
            case 'RESOURCES':
                return this.#resourcesParser
            case 'TEXT':
                return this.#textParser
            case 'APP':
            case 'MESSAGES':
            case 'USERS':
                return this.#unsupportedTypeConverter
            default:
                throw new Error(
                    `Encountered unknown dashboard item type ${dashboardItemType}`
                )
        }
    }

    async #createBrowser() {
        const defaultViewport = { width: 1280, height: 1000 }
        const browserOptions: PuppeteerLaunchOptions = this.#debug
            ? {
                  headless: false,
                  devtools: true,
                  defaultViewport,
                  args: ['--window-size=2560,2160', '--window-position=4000,0'],
                  slowMo: 100,
              }
            : {
                  headless: 'new',
                  defaultViewport,
              }
        const browser = await puppeteer.launch(browserOptions)
        return browser
    }

    #addConversionRequestListener() {
        process.on('message', async (message: ConversionRequestMessage) => {
            if (
                message?.type !== 'ITEM_CONVERSION_REQUEST' ||
                !message.payload
            ) {
                throw new Error(
                    `Received unexpected message with type "${message?.type}"`
                )
            }
            const queueItem: QueueItem = message.payload
            const convertedItem: ConvertedItem = await this.convert(queueItem)

            this.#notifyMainProcess({
                type: 'ITEM_CONVERSION_RESULT',
                payload: convertedItem,
            } as ConversionResultMessage)
        })
    }

    #notifyMainProcess(
        message: ConversionResultMessage | WorkerInitializedMessage
    ) {
        if (!process?.send) {
            throw new Error('Cannont send message from worker to main thread')
        }
        process.send(message)
    }
}
