import fs from 'node:fs/promises'
import { insertIntoMapTemplate } from '../templates'
import { QueueItem } from '../types/ConverterCluster'
import {
    base64EncodeFile,
    createTimer,
    logDashboardItemConversion,
    waitForFileToDownload,
} from '../utils'
import { DashboardItemScraper } from './base/DashboardItemScraper'

/* TODO: remove this when the maps app disables the download
 * button while rendering and has routes */
const waitMs = async (ms: number): Promise<void> =>
    new Promise((resolve) => {
        setTimeout(() => {
            resolve()
        }, ms)
    })

export class MapScraper extends DashboardItemScraper<string> {
    async convert(queueItem: QueueItem) {
        const map = queueItem.dashboardItem.map
        if (!map) {
            throw new Error(
                'function `scrapeMapHtml` received a `dashboardItem` without a `map` object'
            )
        }
        const timer = createTimer()
        await this.page.bringToFront()
        // Make sure we download the exported a file to `./images/${dashboardItemId}`,
        // which allows us to track the download process in a relatively sane way
        const downloadDir = await this.setDownloadPathToItemId(map.id)
        // Open app and wait until all tiles have been fetched
        await this.navigateToItem(map.id)

        // Wait for canvas to be visible
        await this.page.waitForSelector('canvas', { visible: true })
        // Open download view
        await this.clickElementWithText({
            xpath: 'button',
            text: 'Download',
        })
        // Confirm download view is open by verifying this button's visibility
        await this.page.waitForXPath(
            "//button[contains(text(), 'Exit download mode')]",
            { visible: true }
        )
        // Some additional tiles may need to be fetched for the download view
        this.page.waitForNetworkIdle()

        /* TODO: figure out a better solution than simply waiting.
         * We need the map to be ready and this takes time.
         * How much time is probably dependant on the host machine's
         * specs. On my machine waiting any less than 1000ms produces
         * maps that have not fully rendered. Obviously this could
         * be vastly different on another machine, so we need to
         * detect it some other way. */
        await waitMs(1600)
        // Click the next download button to trigger the actual download
        await this.clickElementWithText({
            xpath: 'button',
            text: 'Download',
        })
        // Wait until the file has downloaded and get the full path
        const fullFilePath = await waitForFileToDownload(downloadDir)
        // Convert to base64 encoded string
        const base64Str = await base64EncodeFile(fullFilePath)
        await this.#clearPage()
        await fs.rm(downloadDir, { recursive: true, force: true })
        // Show some progress so it's clear the process is not hanging
        logDashboardItemConversion(
            queueItem.dashboardItem.type,
            fullFilePath,
            timer.getElapsedTime()
        )
        return insertIntoMapTemplate(base64Str)
    }

    async #clearPage() {
        await this.clickElementWithText({
            xpath: 'button',
            text: 'Exit download mode',
        })
        await this.clickElementWithText({
            xpath: 'button',
            text: 'File',
        })
        await this.clickElementWithText({
            xpath: 'span',
            text: 'New',
        })
    }
}
