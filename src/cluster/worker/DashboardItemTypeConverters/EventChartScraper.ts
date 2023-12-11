import fs from 'node:fs/promises'
import { clickElementWithText } from '../../../puppeteer-utils'
import { insertIntoEventChartTemplate } from '../../../templates'
import {
    base64EncodeFile,
    createTimer,
    logDashboardItemConversion,
    waitForFileToDownload,
} from '../../../utils'
import { QueueItem } from '../../types'
import { DashboardItemScraper } from './DashboardItemScraper'

export class EventChartScraper extends DashboardItemScraper<string> {
    async convert(queueItem: QueueItem) {
        const type = queueItem.dashboardItem.type
        const eventChart = queueItem.dashboardItem.eventChart

        if (!eventChart) {
            throw new Error(
                'function `scrapeEventChartHtml` received a `dashboardItem` without a `eventChart` object'
            )
        }
        const timer = createTimer()
        await this.page.bringToFront()

        const { id, name } = eventChart

        // Make sure we download the exported a file to `./images/${dashboardItemId}`,
        // which allows us to track the download process in a relatively sane way
        const downloadDir = await this.setDownloadPathToItemId(id)

        // Open app and wait until network traffic stops
        await this.navigateToItem(id)

        // Wait for key HTML element to be visible
        await this.page.waitForSelector('svg.highcharts-root', {
            visible: true,
        })
        // Open download dropdown and select correct download type
        await clickElementWithText({
            xpath: 'button/span',
            text: 'Download',
            page: this.page,
        })
        await clickElementWithText({
            xpath: 'a/span',
            text: 'Image (.png)',
            page: this.page,
        })

        // Wait until the file has downloaded and get the full path
        const fullFilePath = await waitForFileToDownload(downloadDir)
        // Convert to base64 encoded string
        const base64Str = base64EncodeFile(fullFilePath)
        await this.#clearPage()
        await fs.rm(downloadDir, { recursive: true, force: true })
        // Show some progress so it's clear the process is not hanging
        logDashboardItemConversion(type, fullFilePath, timer.getElapsedTime())

        return insertIntoEventChartTemplate(name, base64Str)
    }

    async #clearPage() {
        await clickElementWithText({
            xpath: 'button/span',
            text: 'Favorites',
            page: this.page,
        })
        await clickElementWithText({
            xpath: 'a/span',
            text: 'New',
            page: this.page,
        })
    }
}
