import fs from 'fs'
import path from 'path'
import { Browser, CDPSession, Page } from 'puppeteer'
import { insertIntoDivTemplate, insertIntoImageTemplate } from '../templates'
import type {
    AnyVisualization,
    Converter,
    ConverterResult,
    DownloadInstructions,
    ParsedScrapeInstructions,
    QueueItem,
    Steps,
} from '../types'
import {
    base64EncodeFile,
    clearDir,
    createTimer,
    downloadPath,
    getDashboardItemVisualization,
    logDashboardItemConversion,
    waitForFileToDownload,
} from '../utils'
import { ScrapeConfigCache } from './ScrapeConfigCache'

const DONWLOAD_PAGE_URL_PATTERN =
    /api\/analytics\/enrollments|events\/query\/[a-zA-Z0-9]{11}\.html\+css/

export class AppScraper implements Converter {
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

    public async convert(queueItem: QueueItem): Promise<ConverterResult> {
        const visualization = getDashboardItemVisualization(
            queueItem.dashboardItem
        )

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

        /* Make sure we download the exported file to `./images/${PID}_${dashboardItemId}`,
         * which allows us to track the download process in a relatively sane way */
        await this.#setDownloadPathToItemId(visualization.id)
        await this.#modifyDownloadUrl(config)
        await this.#showVisualization(config)
        await this.#triggerDownload(config)
        const { html, css } = await this.#obtainDownloadArtifact(
            config,
            visualization
        )
        await this.#clearVisualization(config)

        logDashboardItemConversion(
            queueItem.dashboardItem.type,
            visualization.name,
            timer.getElapsedTime()
        )

        return { html, css }
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

    async #modifyDownloadUrl(config: ParsedScrapeInstructions) {
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

    async #showVisualization(config: ParsedScrapeInstructions) {
        await this.#executeSteps(config.showVisualization.steps)
    }

    async #triggerDownload(config: ParsedScrapeInstructions) {
        await this.#executeSteps(config.triggerDownload.steps)
    }

    async #obtainDownloadArtifact(
        config: ParsedScrapeInstructions,
        visualization: AnyVisualization
    ): Promise<ConverterResult> {
        const downloadInstructions = config.obtainDownloadArtifact
        const usesDownloadPage =
            downloadInstructions.strategy === 'scrapeDownloadPage' ||
            downloadInstructions.strategy === 'screenShotImgOnDownloadPage'
        const downloadPage = usesDownloadPage
            ? await this.#getDownloadPage()
            : null
        const result = await this.#obtainDownloadArtifactForStrategy(
            downloadInstructions,
            visualization,
            downloadPage
        )

        if (usesDownloadPage) {
            await this.page.bringToFront()
            await downloadPage?.close()
        }

        return result
    }

    async #obtainDownloadArtifactForStrategy(
        downloadInstructions: DownloadInstructions,
        visualization: AnyVisualization,
        downloadPage: Page | null
    ) {
        const { strategy, htmlSelector, cssSelector } = downloadInstructions
        if (downloadPage && strategy === 'scrapeDownloadPage') {
            return await this.#scrapeDownloadPage(
                downloadPage,
                visualization.name,
                htmlSelector,
                cssSelector
            )
        } else if (downloadPage && strategy === 'screenShotImgOnDownloadPage') {
            return await this.#screenShotImgOnDownloadPage(
                downloadPage,
                visualization.name,
                htmlSelector
            )
        } else if (strategy === 'interceptFileDownload') {
            return await this.#interceptFileDownload(visualization)
        } else {
            throw new Error(
                'Invalid instructions received for obtaining the download artifact'
            )
        }
    }

    async #scrapeDownloadPage(
        downloadPage: Page,
        name: string,
        htmlSelector: string = '',
        cssSelector: string = ''
    ): Promise<ConverterResult> {
        const rawHtml = await downloadPage.evaluate(
            (selector) => document.querySelector(selector)?.innerHTML,
            htmlSelector
        )
        const css = await downloadPage.evaluate(
            (selector) => document.querySelector(selector)?.innerHTML,
            cssSelector
        )

        return {
            html: insertIntoDivTemplate(rawHtml ?? '', name),
            css: css ?? '',
        }
    }
    async #screenShotImgOnDownloadPage(
        downloadPage: Page,
        name: string,
        htmlSelector: string = ''
    ): Promise<ConverterResult> {
        const img = await downloadPage.waitForSelector(htmlSelector ?? '')
        const base64 = await img?.screenshot({ encoding: 'base64' })
        const base64Str = Buffer.isBuffer(base64)
            ? base64.toString()
            : base64 ?? ''

        return { html: insertIntoImageTemplate(base64Str, name), css: '' }
    }
    async #interceptFileDownload(
        visualization: AnyVisualization
    ): Promise<ConverterResult> {
        // Wait until the file has downloaded and get the full path
        const downloadDir = this.#getItemDownloadPath(visualization.id)
        try {
            const fullFilePath = await waitForFileToDownload(downloadDir)
            // Convert to base64 encoded string
            const base64Str = await base64EncodeFile(fullFilePath)
            // Clear dir for next time
            await clearDir(downloadDir)
            return {
                html: insertIntoImageTemplate(base64Str, visualization.name),
                css: '',
            }
        } catch (error) {
            /* Also clean download dir if file could not be intercepted
             * to avoid issues in subsequent conversions */
            await clearDir(downloadDir)
            throw error
        }
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

    async #clearVisualization(config: ParsedScrapeInstructions) {
        await this.#executeSteps(config.clearVisualization.steps)
    }

    async #setDownloadPathToItemId(id: string) {
        if (!this.#cdpSession) {
            throw new Error('CDP Session has not been initialized')
        }

        await this.#cdpSession.send('Browser.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: this.#getItemDownloadPath(id),
        })
    }

    async #executeSteps(steps: Steps) {
        for (const step of steps) {
            if (step.click && typeof step.click === 'string') {
                await this.page.click(step.click)
            } else if (
                step.waitForSelector &&
                typeof step.waitForSelector === 'string'
            ) {
                await this.page.waitForSelector(step.waitForSelector)
            } else if (step.goto && typeof step.goto === 'string') {
                await this.page.goto(step.goto, { waitUntil: 'networkidle2' })
            } else {
                throw new Error(
                    `Failed to intepret step "${JSON.stringify(step)}"`
                )
            }
        }
    }

    #getItemDownloadPath(id: string) {
        return path.join(downloadPath, `${id}_${process.pid}`)
    }
}
