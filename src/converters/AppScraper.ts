import fs from 'fs'
import path from 'path'
import { Browser, CDPSession, Page } from 'puppeteer'
import {
    Converter,
    ConverterResultObject,
    QueueItem,
} from '../types/ConverterCluster'
import { createTimer, downloadPath, logDashboardItemConversion } from '../utils'
import { ScrapeConfigCache } from './ScrapeConfigCache'
import {
    ConditionalSelector,
    ScrapeInstructions,
    ScrapeVisualization,
    Steps,
    StepKind,
} from '../types'
import { parseTemplate } from '../templates/parseTemplate'
import { insertIntoLineListTemplate } from '../templates'

const DONWLOAD_PAGE_URL_PATTERN =
    /api\/analytics\/enrollments|events\/query\/[a-zA-Z0-9]{11}\.html\+css/

/**
 * This class does not extend the DashbooardItemSraper because it is meant to replace it
 * entirely. The plan is as follows:
 * 1. [DONE] Create JSON instruction files for each app
 * 2. [DONE - apart from maps-app] Install versions of the apps into the local instance which have the right class-names, etc
 * 3. [DONE] Implement config cache
 * 4. Implement type conversion based on config files and migrate from app-specific converter to this one one by one
 * 5. Remove app-specific converters and the underlying base DashboardItemScraper
 * 6. Cleanup
 */

// TODO: Converter interface should simply always return an object with html and css properties
export class AppScraper implements Converter<ConverterResultObject> {
    baseUrl: string
    #browser: Browser | null
    #page: Page | null
    #cdpSession: CDPSession | null
    #configCache: ScrapeConfigCache

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl
        this.#page = null
        this.#browser = null
        this.#cdpSession = null
        this.#configCache = new ScrapeConfigCache(baseUrl)
    }

    async init(browser: Browser) {
        this.#browser = browser
        this.#page = await browser.newPage()
        this.#cdpSession = await this.#page.target().createCDPSession()
        await this.#cdpSession.send('Browser.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath,
        })
    }

    get browser() {
        if (!this.#browser) {
            throw new Error('Browser has not been initialized')
        } else {
            return this.#browser
        }
    }

    get page() {
        if (!this.#page) {
            throw new Error('Page has not been initialized')
        } else {
            return this.#page
        }
    }

    public async takeErrorScreenShot(queueItem: QueueItem) {
        const dir = './error-screenshots'
        const id = queueItem.dashboardItem.id

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir)
        }

        await this.page.screenshot({
            path: path.resolve(dir, `${id}.png`),
        })
    }

    async #setDownloadPathToItemId(id: string) {
        if (!this.#cdpSession) {
            throw new Error('CDP Session has not been initialized')
        }

        const itemDownloadPath = path.join(downloadPath, id)

        await this.#cdpSession.send('Browser.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: itemDownloadPath,
        })

        return itemDownloadPath
    }

    async convert(queueItem: QueueItem): Promise<ConverterResultObject> {
        if (this.#isUnsupportedSubType(queueItem)) {
            // return an empty string as we do for unsupported main types
            return Promise.resolve({ html: '', css: '' })
        }
        const { id, name } = this.#parseVisualization(queueItem)
        const timer = createTimer()
        await this.page.bringToFront()
        const config = await this.#configCache.getScrapeConfig(
            queueItem.dashboardItem
        )

        await this.#modifyDownloadUrl(config)
        await this.#showVisualization(config, id)
        await this.#triggerDownload(config)
        const { html, css } = await this.#obtainDownloadArtifact(config, name)

        logDashboardItemConversion(
            queueItem.dashboardItem.type,
            name,
            timer.getElapsedTime()
        )

        return { html, css }
    }

    #parseVisualization(queueItem: QueueItem) {
        const visualization =
            this.#getVisualizationForDashboardItemType(queueItem)
        if (!visualization) {
            throw new Error(
                `Could not get visualization of type "${queueItem.dashboardItem.type}" from dashboard-item "${queueItem.dashboardItem.id}"`
            )
        }
        return visualization
    }

    #getVisualizationForDashboardItemType(
        queueItem: QueueItem
    ): ScrapeVisualization | undefined {
        switch (queueItem.dashboardItem.type) {
            case 'EVENT_CHART':
                return queueItem.dashboardItem.eventChart
            case 'EVENT_REPORT':
                return queueItem.dashboardItem.eventReport
            case 'EVENT_VISUALIZATION':
                return queueItem.dashboardItem.eventVisualization
            case 'MAP':
                return queueItem.dashboardItem.map
            case 'VISUALIZATION':
                return queueItem.dashboardItem.visualization
            default:
                throw new Error(
                    `Received unsupported type ${queueItem.dashboardItem.type}`
                )
        }
    }

    #isUnsupportedSubType(queueItem: QueueItem) {
        if (queueItem.dashboardItem.type === 'EVENT_VISUALIZATION') {
            const eventVisualizationType =
                queueItem.dashboardItem.eventVisualization?.type
            // We only support event-visualizations of type line-lists
            return (
                !!eventVisualizationType &&
                eventVisualizationType !== 'LINE_LIST'
            )
        }
    }

    async #modifyDownloadUrl(config: ScrapeInstructions) {
        const shouldModify =
            config.obtainDownloadArtifact.strategy === 'scrapeDownloadPage' &&
            config.obtainDownloadArtifact.modifyDownloadUrl
        const searchValue =
            config.obtainDownloadArtifact.modifyDownloadUrl?.searchValue ?? ''
        const replaceValue =
            config.obtainDownloadArtifact.modifyDownloadUrl?.replaceValue ?? ''
        const stringifiedRegexObj = JSON.stringify({
            flags: DONWLOAD_PAGE_URL_PATTERN.flags,
            source: DONWLOAD_PAGE_URL_PATTERN.source,
        })

        await this.page.evaluateOnNewDocument(
            (options) => {
                if (options.shouldModify) {
                    const regexObj = JSON.parse(options.stringifiedRegexObj)
                    const regex = new RegExp(regexObj.source, regexObj.flags)

                    const originalWindowOpen = window.open

                    window.open = (...args) => {
                        const url =
                            (args[0] instanceof URL
                                ? args[0].toString()
                                : args[0]) ?? ''

                        if (regex.test(url)) {
                            args[0] = url.replace(
                                options.searchValue,
                                options.replaceValue
                            )
                        }

                        return originalWindowOpen(...args)
                    }
                }
            },
            {
                shouldModify,
                searchValue,
                replaceValue,
                stringifiedRegexObj,
            }
        )
    }

    async #showVisualization(config: ScrapeInstructions, id: string) {
        if (config.showVisualization.strategy === 'navigateToUrl') {
            await this.#navigateToVisualization(config, id)
        }
    }

    async #navigateToVisualization(config: ScrapeInstructions, id: string) {
        const urlTemplate = ensureIsString(
            findStepValueByKind(config.showVisualization.steps, 'goto')
        )
        const selector = ensureIsString(
            findStepValueByKind(
                config.showVisualization.steps,
                'waitForSelector'
            )
        )
        const url = parseTemplate(urlTemplate, { appUrl: config.appUrl, id })

        await this.page.goto(url, { waitUntil: 'networkidle2' })
        await this.page.waitForSelector(selector, { visible: true })
    }

    async #triggerDownload(config: ScrapeInstructions) {
        if (config.triggerDownload.strategy === 'useUiElements') {
            /* For now we simply assume all UI element interactions
             * are clicks. If use cases present themselves where this
             * is not the case we will need to add complexity here */
            const clickSelectors = filterStepValuesByKind(
                config.triggerDownload.steps,
                'click'
            ).map((payload) => ensureIsString(payload))

            for (const selector of clickSelectors) {
                await this.page.click(selector)
            }
        }
    }

    async #obtainDownloadArtifact(
        config: ScrapeInstructions,
        name: string
    ): Promise<ConverterResultObject> {
        const result: ConverterResultObject = {
            html: '',
            css: '',
        }
        const usesDownloadPage = this.#usesDownloadPage(config)
        const downloadPage = usesDownloadPage
            ? await this.#getDownloadPage()
            : null

        if (
            downloadPage &&
            config.obtainDownloadArtifact.strategy === 'scrapeDownloadPage'
        ) {
            const rawHtml =
                (await downloadPage.evaluate(
                    () => document.querySelector('body')?.innerHTML
                )) ?? ''
            result.html = insertIntoLineListTemplate(name, rawHtml)
            result.css =
                (await downloadPage.evaluate(
                    () => document.querySelector('style')?.innerHTML
                )) ?? ''
        }
        if (usesDownloadPage) {
            await this.page.bringToFront()
            await downloadPage?.close()
        }

        return result
    }

    #usesDownloadPage(config: ScrapeInstructions) {
        const downloadStrategy = config.obtainDownloadArtifact.strategy
        return (
            downloadStrategy === 'scrapeDownloadPage' ||
            downloadStrategy === 'screenShotImgOnDownloadPage'
        )
    }

    /* When a file opens in another tab (i.e. the app calls `window.open()`)
     * then a new "target" will appear. To verify that the target in question
     * is in fact the right one, we check if it was opened by a page with the
     * expected URL. */
    async #getDownloadPage() {
        const pageUrl = this.page?.url()
        const downloadPage = await this.browser
            .waitForTarget((target) => target.opener()?.url() === pageUrl)
            .then((target) => target.page())

        if (!downloadPage) {
            throw new Error('Could not find download page')
        }
        return downloadPage
    }
}

function findStepValueByKind(
    steps: Steps,
    kind: StepKind
): string | ConditionalSelector {
    const step = steps.find((step) => !!step[kind])

    if (!step || !step[kind]) {
        throw new Error(`Could not find step of kind "${kind}"`)
    }
    return step[kind]
}

function filterStepValuesByKind(
    steps: Steps,
    kind: StepKind
): Array<string | ConditionalSelector> {
    const payloads = steps
        .filter((step) => !!step[kind])
        .map((step) => step[kind])

    if (payloads.length === 0) {
        throw new Error(`Could not find any steps of kind "${kind}"`)
    }
    return payloads
}

function ensureIsString(value: unknown): string {
    if (typeof value !== 'string') {
        throw new Error('Could not read goto url from config')
    }
    return value
}
