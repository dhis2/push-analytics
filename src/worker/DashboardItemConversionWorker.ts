import process from 'node:process'
import puppeteer, { Browser, PuppeteerLaunchOptions } from 'puppeteer'
import {
    EventChartScraper,
    EventReportScraper,
    LineListScraper,
    MapScraper,
    ReportsParser,
    ResourcesParser,
    TextParser,
    UnsupportedTypeConverter,
    VisualizationScraper,
} from '../converters'
import {
    ConversionRequestMessage,
    ConversionResultMessage,
    ConvertedItem,
    QueueItem,
} from '../types/ConverterCluster'
import { LoginPage } from './LoginPage'
import { DashboardItemType } from '../types'
import { insertIntoConversionErrorTemplate } from '../templates'

export class DashboardItemConversionWorker {
    #initialized: boolean
    #baseUrl: string
    #debug: boolean
    #browser: Browser | null
    #loginPage: LoginPage | null
    #eventChartScraper: EventChartScraper
    #eventReportScraper: EventReportScraper
    #lineListScraper: LineListScraper
    #mapScraper: MapScraper
    #reportsParser: ReportsParser
    #resourcesParser: ResourcesParser
    #textParser: TextParser
    #unsupportedTypeConverter: UnsupportedTypeConverter
    #visualizationScraper: VisualizationScraper

    constructor(baseUrl: string, debug: boolean) {
        this.#initialized = false
        this.#baseUrl = baseUrl
        this.#debug = debug
        this.#browser = null
        this.#loginPage = null
        this.#eventChartScraper = new EventChartScraper(
            baseUrl,
            'dhis-web-event-visualizer',
            true
        )
        this.#eventReportScraper = new EventReportScraper(
            baseUrl,
            'dhis-web-event-reports',
            true
        )
        this.#lineListScraper = new LineListScraper(
            baseUrl,
            'api/apps/line-listing',
            false
        )
        this.#mapScraper = new MapScraper(baseUrl, 'dhis-web-maps', true)
        this.#reportsParser = new ReportsParser(baseUrl)
        this.#resourcesParser = new ResourcesParser(baseUrl)
        this.#textParser = new TextParser()
        this.#unsupportedTypeConverter = new UnsupportedTypeConverter()
        this.#visualizationScraper = new VisualizationScraper(
            baseUrl,
            'dhis-web-data-visualizer',
            false
        )
        this.#addConversionRequestListener()
    }

    get browser() {
        if (!this.#browser) {
            throw new Error('Browser has not been initialized')
        } else {
            return this.#browser
        }
    }

    get loginPage() {
        if (!this.#loginPage) {
            throw new Error('Login page has not been initialized')
        } else {
            return this.#loginPage
        }
    }

    public async convert(queueItem: QueueItem) {
        if (!process?.send) {
            throw new Error('Cannont send message from worker to main thread')
        }
        if (!this.#initialized) {
            // Note that this also logs in, hence the else
            await this.#init(queueItem.username, queueItem.password)
        } else {
            /* TODO: if we keep this way of logging in we'll need
             * to check if this is conversion is for a new user,
             * in which case we need to login as that new
             * user. If it's for the same user we need to (somehow)
             * check if the session is still valid and login if not */
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

    async #init(username: string, password: string) {
        this.#browser = await this.#createBrowser()
        const [firstBlankPage] = await this.#browser.pages()
        this.#loginPage = new LoginPage(firstBlankPage, this.#baseUrl)
        await this.#loginPage.login(username, password)

        /* Scrapers need to be initialised with the browser instance
         * but Parsers are ready to convert after initialisation */
        await this.#eventChartScraper.init(this.#browser)
        await this.#eventReportScraper.init(this.#browser)
        await this.#lineListScraper.init(this.#browser)
        await this.#mapScraper.init(this.#browser)
        await this.#visualizationScraper.init(this.#browser)

        this.#initialized = true

        return this.#initialized
    }

    async #convertItemType(queueItem: QueueItem) {
        const itemTypeConverter = this.#getConverterForItemType(
            queueItem.dashboardItem.type
        )
        try {
            const result = await itemTypeConverter.convert(queueItem)
            return result
        } catch (error) {
            if ('takeErrorScreenShot' in itemTypeConverter) {
                await itemTypeConverter.takeErrorScreenShot(queueItem)
            }

            return Promise.resolve(
                insertIntoConversionErrorTemplate(queueItem, error)
            )
        }
    }

    #getConverterForItemType(dashboardItemType: DashboardItemType) {
        switch (dashboardItemType) {
            case 'VISUALIZATION':
                return this.#visualizationScraper
            case 'EVENT_VISUALIZATION':
                return this.#lineListScraper
            case 'EVENT_CHART':
                return this.#eventChartScraper
            case 'MAP':
                return this.#mapScraper
            case 'EVENT_REPORT':
                return this.#eventReportScraper
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
        if (!process?.send) {
            throw new Error('Cannont send message from worker to main thread')
        }

        process.on('message', async (message: ConversionRequestMessage) => {
            try {
                if (
                    message?.type !== 'ITEM_CONVERSION_REQUEST' ||
                    !message.payload
                ) {
                    throw new Error(
                        `Received unexpected message with type "${message?.type}"`
                    )
                }
                const queueItem: QueueItem = message.payload
                const convertedItem: ConvertedItem = await this.convert(
                    queueItem
                )

                if (!process?.send) {
                    throw new Error(
                        'Cannont send message from worker to main thread'
                    )
                }
                process.send({
                    type: 'ITEM_CONVERSION_RESULT',
                    payload: convertedItem,
                } as ConversionResultMessage)
            } catch (error) {
                console.log(error)
                throw error
            }
        })
    }
}
