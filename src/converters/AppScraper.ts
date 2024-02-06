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
    AnyVisualization,
    Steps,
    StepKind,
    EventChart,
    EventReport,
    EventVisualization,
    Dhis2Map,
    Visualization,
    DashboardItem,
    DownloadInstructions,
} from '../types'
import { insertIntoDiv, insertIntoImage, parseTemplate } from '../templates'

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
        const visualization =
            this.#getVisualizationForDashboardItemType(queueItem)

        if (
            queueItem.dashboardItem.type === 'EVENT_VISUALIZATION' &&
            visualization.type !== 'LINE_LIST'
        ) {
            /* We only support event-visualizations of type line-lists.
             * For any other type we return empty HTML as we do for all
             * all unsupported dashboard item types */
            return Promise.resolve({ html: '', css: '' })
        }

        const timer = createTimer()
        await this.page.bringToFront()
        const config = await this.#configCache.getScrapeConfig(
            queueItem.dashboardItem
        )

        await this.#modifyDownloadUrl(config)
        await this.#showVisualization(
            config,
            visualization,
            queueItem.dashboardItem
        )
        await this.#triggerDownload(config)
        const { html, css } = await this.#obtainDownloadArtifact(
            config,
            queueItem.dashboardItem,
            visualization.name
        )
        await this.#clearVisualization(config)

        logDashboardItemConversion(
            queueItem.dashboardItem.type,
            visualization.name,
            timer.getElapsedTime()
        )

        return { html, css }
    }

    #getVisualizationForDashboardItemType(
        queueItem: QueueItem
    ): AnyVisualization {
        switch (queueItem.dashboardItem.type) {
            case 'EVENT_CHART':
                return queueItem.dashboardItem.eventChart as EventChart
            case 'EVENT_REPORT':
                return queueItem.dashboardItem.eventReport as EventReport
            case 'EVENT_VISUALIZATION':
                return queueItem.dashboardItem
                    .eventVisualization as EventVisualization
            case 'MAP':
                return queueItem.dashboardItem.map as Dhis2Map
            case 'VISUALIZATION':
                return queueItem.dashboardItem.visualization as Visualization
            default:
                throw new Error(
                    `Received unsupported type ${queueItem.dashboardItem.type}`
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

    async #showVisualization(
        config: ScrapeInstructions,
        visualization: AnyVisualization,
        dashboardItem: DashboardItem
    ) {
        if (config.showVisualization.strategy === 'navigateToUrl') {
            await this.#navigateToVisualization(
                config,
                visualization,
                dashboardItem
            )
        }
    }

    async #navigateToVisualization(
        config: ScrapeInstructions,
        visualization: AnyVisualization,
        dashboardItem: DashboardItem
    ) {
        const urlTemplate = ensureIsString(
            findStepValueByKind(config.showVisualization.steps, 'goto')
        )
        const url = parseTemplate(urlTemplate, {
            appUrl: config.appUrl,
            id: visualization.id,
        })
        await this.page.goto(url, { waitUntil: 'networkidle2' })

        const selector = ensureIsString(
            findStepValueByKind(
                config.showVisualization.steps,
                'waitForSelector'
            )
        )

        if (selector) {
            await this.page.waitForSelector(selector, { visible: true })
        } else {
            const conditionalSelector = findStepValueByKind(
                config.showVisualization.steps,
                'waitForSelectorConditionally'
            ) as ConditionalSelector
            const currentSelector = conditionalSelector.find(
                ({ dashboardItemProperty, value }) =>
                    getNestedPropertyValue(
                        dashboardItem,
                        dashboardItemProperty
                    ) === value
            )?.selector

            if (!currentSelector) {
                throw new Error(
                    'Could not determine which selector to wait for'
                )
            }

            await this.page.waitForSelector(currentSelector, { visible: true })
        }
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
        dashboardItem: DashboardItem,
        name: string
    ): Promise<ConverterResultObject> {
        const result: ConverterResultObject = {
            html: '',
            css: '',
        }
        const currentConfig =
            config.obtainDownloadArtifact ||
            (config.obtainDownloadArtifactConditionally &&
                config.obtainDownloadArtifactConditionally.find(
                    ({ dashboardItemProperty, value }) =>
                        getNestedPropertyValue(
                            dashboardItem,
                            dashboardItemProperty
                        ) === value
                ))
        const usesDownloadPage = this.#usesDownloadPage(currentConfig)
        const downloadPage = usesDownloadPage
            ? await this.#getDownloadPage()
            : null

        if (downloadPage && currentConfig.strategy === 'scrapeDownloadPage') {
            const rawHtml =
                (await downloadPage.evaluate(
                    (selector) =>
                        document.querySelector(selector ?? '')?.innerHTML,
                    currentConfig.htmlSelector
                )) ?? ''
            result.html = insertIntoDiv(rawHtml, name)
            result.css =
                (await downloadPage.evaluate(
                    (selector) =>
                        document.querySelector(selector ?? '')?.innerHTML,
                    currentConfig.htmlSelector
                )) ?? ''
        } else if (
            downloadPage &&
            currentConfig.strategy === 'screenShotImgOnDownloadPage'
        ) {
            const img = await downloadPage.waitForSelector(
                currentConfig.htmlSelector ?? ''
            )
            const base64 = await img?.screenshot({ encoding: 'base64' })
            const base64Str = Buffer.isBuffer(base64)
                ? base64.toString()
                : base64 ?? ''
            result.html = insertIntoImage(base64Str, name)
        }

        if (usesDownloadPage) {
            await this.page.bringToFront()
            await downloadPage?.close()
        }

        return result
    }

    #usesDownloadPage(downloadInstructions: DownloadInstructions) {
        const downloadStrategy = downloadInstructions.strategy
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

    async #clearVisualization(config: ScrapeInstructions) {
        if (config.clearVisualization.strategy === 'navigateToUrl') {
            const urlTemplate = ensureIsString(
                findStepValueByKind(config.showVisualization.steps, 'goto')
            )
            const url = parseTemplate(urlTemplate, { appUrl: config.appUrl })
            this.page.goto(url)
        }
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

function getNestedPropertyValue(obj: object, str: string) {
    const nestedValue = str
        .split('.')
        .reduce((val: object | string | number | boolean, key: string) => {
            /* Below is a small TypeScript hoop we had to jump through:
             * There is absolutely no way to guarrantee that (nested)
             * properties like 'visualization.type' actually exist on the
             * provided object. And since these are ultimately coming from
             * the JSON config files, which are meant to be generic, there is
             * no point creating types for this. So we have to explcitely
             * tell TS the provided string represents a valid object path
             * to avoid a compilation error. I suppose the comiler has a point:
             * this is quite fragile, the try/catch will help. */
            try {
                val = val[key as keyof typeof val]
            } catch {
                // Just keep val
            }

            return val
        }, obj)

    return nestedValue as string | boolean | number
}