import fs from 'fs'
import { minimatch } from 'minimatch'
import path from 'path'
import type { Browser, CDPSession, HTTPResponse, Page } from 'puppeteer'
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
    downloadPath,
    getDashboardItemVisualization,
    waitForFileToDownload,
} from './AppScraperUtils'
import { AppScraperError } from './AppScraperUtils/AppScraperError'
import {
    insertIntoDivTemplate,
    insertIntoImageTemplate,
    parseResponseDataToTable,
} from './htmlTemplates'

const DONWLOAD_PAGE_URL_PATTERN =
    /api\/analytics\/enrollments|events\/query\/[a-zA-Z0-9]{11}\.html\+css/

export class AppScraper implements Converter {
    baseUrl: string
    #browser: Browser
    #page: Page
    #cdpSession: CDPSession
    #currentRequestUrlGlob: string
    #interceptedResponseHtml: ConverterResult | null

    protected constructor(
        baseUrl: string,
        browser: Browser,
        page: Page,
        cdpSession: CDPSession
    ) {
        this.baseUrl = baseUrl
        this.#browser = browser
        this.#page = page
        this.#cdpSession = cdpSession
        this.#currentRequestUrlGlob = ''
        this.#interceptedResponseHtml = null
        page.on('response', this.#interceptResponse.bind(this))
    }

    static async create(baseUrl: string, browser: Browser) {
        const page = await browser.newPage()
        const cdpSession = await page.target().createCDPSession()

        await cdpSession.send('Browser.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath,
        })

        return new AppScraper(baseUrl, browser, page, cdpSession)
    }

    get browser() {
        if (!this.#browser) {
            throw new AppScraperError('Browser has not been initialized')
        } else {
            return this.#browser
        }
    }

    get page() {
        if (!this.#page) {
            throw new AppScraperError('Page has not been initialized')
        } else {
            return this.#page
        }
    }

    public async convert(
        queueItem: QueueItem,
        config: ParsedScrapeInstructions
    ): Promise<ConverterResult> {
        try {
            const visualization = getDashboardItemVisualization(queueItem.dashboardItem)

            if (
                queueItem.dashboardItem.type === 'EVENT_VISUALIZATION' &&
                visualization.type !== 'LINE_LIST'
            ) {
                /* We only support event-visualizations of type line-lists.
                 * For any other type we return empty HTML as we do for all
                 * all unsupported dashboard item types */
                return Promise.resolve({ html: '', css: '' })
            }
            await this.page.bringToFront()
            await this.#updateRequestUrlGlob(config)
            await this.#clearVisualization(config)
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

            return { html, css }
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'An unknown conversion error occurred'
            throw new AppScraperError(message)
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
                            (args[0] instanceof URL ? args[0].toString() : args[0]) ?? ''

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
        if (config.showVisualization.strategy !== 'noop') {
            await this.#executeSteps(config.showVisualization.steps)
        }
    }

    async #triggerDownload(config: ParsedScrapeInstructions) {
        if (config.triggerDownload.strategy !== 'noop') {
            await this.#executeSteps(config.triggerDownload.steps)
        }
    }

    async #obtainDownloadArtifact(
        config: ParsedScrapeInstructions,
        visualization: AnyVisualization
    ): Promise<ConverterResult> {
        const downloadInstructions = config.obtainDownloadArtifact
        const usesDownloadPage =
            downloadInstructions.strategy === 'scrapeDownloadPage' ||
            downloadInstructions.strategy === 'screenShotImgOnDownloadPage'
        const downloadPage = usesDownloadPage ? await this.#getDownloadPage() : null
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
        } else if (strategy === 'interceptResponse') {
            return this.#getAndClearInterceptedResponseHtml(downloadInstructions)
        } else {
            throw new AppScraperError(
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
        const base64Str = Buffer.isBuffer(base64) ? base64.toString() : base64 ?? ''

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
            throw new AppScraperError('Could not find download page')
        }
        return downloadPage
    }

    async #clearVisualization(config: ParsedScrapeInstructions) {
        if (config.clearVisualization.strategy !== 'noop') {
            await this.#executeSteps(config.clearVisualization.steps)
        }
    }

    async #setDownloadPathToItemId(id: string) {
        if (!this.#cdpSession) {
            throw new AppScraperError('CDP Session has not been initialized')
        }

        await this.#cdpSession.send('Browser.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: this.#getItemDownloadPath(id),
        })
    }

    async #updateRequestUrlGlob(config: ParsedScrapeInstructions) {
        if (config.obtainDownloadArtifact.strategy === 'interceptResponse') {
            this.#currentRequestUrlGlob = config.obtainDownloadArtifact.urlGlob ?? ''
        } else {
            this.#currentRequestUrlGlob = ''
        }
    }

    async #interceptResponse(response: HTTPResponse): Promise<void> {
        if (
            this.#currentRequestUrlGlob &&
            minimatch(response.url(), this.#currentRequestUrlGlob)
        ) {
            const responseData = await response.json()
            this.#interceptedResponseHtml = {
                html: parseResponseDataToTable(responseData),
                css: '',
            }
        }
    }

    #getAndClearInterceptedResponseHtml(downloadInstructions: DownloadInstructions) {
        // Store a "snapshot" so the global property can be cleared
        const interceptedResponseHtml = this.#interceptedResponseHtml

        this.#currentRequestUrlGlob = ''
        this.#interceptedResponseHtml = null

        if (!interceptedResponseHtml) {
            throw new AppScraperError(
                `Failed to intercept response data for request matching glob "${downloadInstructions.urlGlob}"`
            )
        }

        return interceptedResponseHtml
    }

    async #executeSteps(steps: Steps) {
        for (const step of steps) {
            if (step.click && typeof step.click === 'string') {
                await this.page.click(step.click)
            } else if (step.waitForSelector && typeof step.waitForSelector === 'string') {
                await this.page.waitForSelector(step.waitForSelector)
            } else if (step.goto && typeof step.goto === 'string') {
                await this.page.goto(step.goto, { waitUntil: 'networkidle2' })
            } else {
                throw new AppScraperError(
                    `Failed to intepret step "${JSON.stringify(step)}"`
                )
            }
        }
    }

    #getItemDownloadPath(id: string) {
        return path.join(downloadPath, `${id}_${process.pid}`)
    }
}
