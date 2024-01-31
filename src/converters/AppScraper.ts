import fs from 'fs'
import path from 'path'
import { Browser, CDPSession, ElementHandle, Page } from 'puppeteer'
import {
    Converter,
    ConverterResultObject,
    QueueItem,
} from '../types/ConverterCluster'
import { downloadPath, escapeXpathString } from '../utils'

/**
 * This class does not extend the DashbooardItemSraper because it is meant to replace it
 * entirely. The plan is as follows:
 * 1. [DONE] Create JSON instruction files for each app
 * 2. [DONE - apart from maps-app] Install versions of the apps into the local instance which have the right class-names, etc
 * 3. Implement config cache
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

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl
        this.#page = null
        this.#browser = null
        this.#cdpSession = null
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

    async navigateToItem(id: string) {
        return await this.page.goto(this.#getItemUrl(id), {
            waitUntil: 'networkidle2',
        })
    }

    /* This base implementation only works with apps which have implemented client-side routes */
    async clearVisualization() {
        return await this.page.goto(this.appUrl, {
            waitUntil: 'networkidle2',
        })
    }

    async setDownloadPathToItemId(id: string) {
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

    /* When a file opens in another tab (i.e. the app calls `window.open()`)
     * then a new "target" will appear. To verify that the target in question
     * is in fact the right one, we check if it was opened by a page with the
     * expected URL. */
    async getDownloadPage(id: string) {
        const itemUrl = this.#getItemUrl(id)
        const downloadPage = await this.browser
            .waitForTarget((target) => target.opener()?.url() === itemUrl)
            .then((target) => target.page())

        if (!downloadPage) {
            throw new Error('Could not find download page')
        }
        return downloadPage
    }

    async clickElementWithText({
        xpath = 'button',
        text = 'Download',
    }: {
        xpath?: string
        text?: string
    }) {
        const escapedText = escapeXpathString(text)
        const elHandles = await this.page.$x(
            `//${xpath}[contains(text(), ${escapedText})]`
        )

        if (elHandles.length === 1) {
            const elHandle = elHandles[0] as ElementHandle<Element>
            await elHandle.click()
        } else {
            if (elHandles.length === 0) {
                throw new Error(
                    `Element with xpath "${xpath}" and text "${text}" not found`
                )
            } else {
                throw new Error(
                    `Encountered ${elHandles.length} menu items with xpath "${xpath}" and text "${text}"`
                )
            }
        }
    }

    async convert(queueItem: QueueItem): Promise<ConverterResultObject> {
        throw new Error(
            `Convertor not implemented for dashboard item type "${queueItem.dashboardItem.type}"`
        )
    }
}
