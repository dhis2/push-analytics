import { insertIntoMapTemplate } from '../templates'
import type { ConverterFn } from '../types'
import { createTimer, waitForFileToDownload } from '../utils'
import { base64EncodeFile } from '../utils/base64EncodeFile'
import { logDashboardItemConversion } from '../utils/logDashboardItemConversion'
import { clickElementWithText } from './clickElementWithText'
import { waitMs } from './waitMs'

export const getMapHtml: ConverterFn = async (dashboardItem, page) => {
    if (!dashboardItem.map) {
        throw new Error(
            'function `getMapHtml` received a `dashboardItem` without a `map` object'
        )
    }
    const timer = createTimer()
    // Make sure we download the exported a file to `./images/${dashboardId}`,
    // which allows us to track the download process in a relatively sane way
    const downloadDir = page.setDownloadPathToItemId(dashboardItem.map.id)
    // Open app and wait until all tiles have been fetched
    await page.gotoPath(`dhis-web-maps/?id=${dashboardItem.map.id}`, {
        waitUntil: 'networkidle2',
    })
    // Wait for canvas to be visible
    await page.waitForSelector('canvas', { visible: true })
    // Open download view
    await clickElementWithText({ xpath: 'button', text: 'Download', page })
    // Confirm download view is open by verifying this button's visibility
    await page.waitForXPath(
        "//button[contains(text(), 'Exit download mode')]",
        { visible: true }
    )
    // Some additional tiles may need to be fetched for the download view
    page.waitForNetworkIdle()

    /* TODO: figure out a better solution than simply waiting.
     * We need the map to be ready and this takes time.
     * How much time is probably dependant on the host machine's
     * specs. On my machine waiting any less than 1000ms produces
     * maps that have not fully rendered. Obviously this could
     * be vastly different on another machine, so we need to
     * detect it some other way. */
    await waitMs(1600)
    // Click the next download button to trigger the actual download
    await clickElementWithText({ xpath: 'button', text: 'Download', page })
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

    return insertIntoMapTemplate(base64Str)
}
