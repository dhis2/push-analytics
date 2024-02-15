import fs from 'node:fs/promises'
import { insertIntoEventChartTemplate } from '../templates'
import { QueueItem } from '../types/ConverterCluster'
import {
    base64EncodeFile,
    createTimer,
    logDashboardItemConversion,
    waitForFileToDownload,
} from '../utils'
import { DashboardItemScraper } from './base/DashboardItemScraper'

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
        await this.clickElementWithText({
            xpath: 'button/span',
            text: 'Download',
        })
        await this.clickElementWithText({
            xpath: 'a/span',
            text: 'Image (.png)',
        })

        // Wait until the file has downloaded and get the full path
        const fullFilePath = await waitForFileToDownload(downloadDir)
        // Convert to base64 encoded string
        const base64Str = await base64EncodeFile(fullFilePath)
        await this.#clearPage()
        await fs.rm(downloadDir, { recursive: true, force: true })
        // Show some progress so it's clear the process is not hanging
        logDashboardItemConversion(type, fullFilePath, timer.getElapsedTime())

        return insertIntoEventChartTemplate(name, base64Str)
    }

    async #clearPage() {
        await this.clickElementWithText({
            xpath: 'button/span',
            text: 'Favorites',
        })
        await this.clickElementWithText({
            xpath: 'a/span',
            text: 'New',
        })
    }
}
