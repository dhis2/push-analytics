import type { ConverterFn } from '../types'
import { base64EncodeFile, createTimer, waitForFileToDownload } from '../utils'
import { insertIntoEventChartTemplate } from '../templates'
import { logDashboardItemConversion } from '../utils'
import { clickElementWithText } from '../puppeteer-utils'

export const scrapeEventChartHtml: ConverterFn = async (
    dashboardItem,
    page
) => {
    if (!dashboardItem.eventChart) {
        throw new Error(
            'function `scrapeEventChartHtml` received a `dashboardItem` without a `eventChart` object'
        )
    }
    const timer = createTimer()

    const { id, name } = dashboardItem.eventChart

    // Make sure we download the exported a file to `./images/${dashboardItemId}`,
    // which allows us to track the download process in a relatively sane way
    const downloadDir = page.setDownloadPathToItemId(id)

    // Open app and wait until network traffic stops
    await page.gotoPath(`dhis-web-event-visualizer/?id=${id}`, {
        waitUntil: 'networkidle2',
    })

    // Wait for key HTML element to be visible
    await page.waitForSelector('svg.highcharts-root', { visible: true })
    // Open download dropdown and select correct download type
    await clickElementWithText({ xpath: 'button/span', text: 'Download', page })
    await clickElementWithText({ xpath: 'a/span', text: 'Image (.png)', page })

    // Wait until the file has downloaded and get the full path
    const fullFilePath = await waitForFileToDownload(downloadDir)
    // Convert to base64 encoded string
    const base64Str = base64EncodeFile(fullFilePath)
    // Show some progress so it's clear the process is not hanging
    logDashboardItemConversion(
        dashboardItem.type,
        fullFilePath,
        timer.getElapsedTime()
    )

    return insertIntoEventChartTemplate(name, base64Str)
}
