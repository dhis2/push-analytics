import type { ConverterFn } from '../types'
// import { waitForFileToDownload } from '../utils'
// import { base64EncodeFile } from '../utils/base64EncodeFile'
import { clickButtonWithText } from './clickButtonWithText'
import { clickHoverMenuItemWithText } from './clickHoverMenuItemWithText'
// import { logImageConversion } from './logImageConversion'
// import { waitMs } from './waitMs'

export const getVisualizationHtml: ConverterFn = async (
    dashboardItem,
    page,
    browser
) => {
    if (!dashboardItem.visualization) {
        throw new Error(
            'function `getVisualizationHtml` received a `dashboardItem` without a `visualization` object'
        )
    }
    const { id, name, type } = dashboardItem.visualization
    const isPivotTable = type === 'PIVOT_TABLE'

    // Open app and wait until network traffic stops
    await page.gotoPath(`dhis-web-data-visualizer/#/${id}`, {
        waitUntil: 'networkidle2',
    })

    // Wait for key HTML element to be visible
    const selectorForType = isPivotTable
        ? '.pivot-table-container > table'
        : '.highcharts-container'
    await page.waitForSelector(selectorForType, { visible: true })
    // Open download dropdown and select correct download type
    await clickButtonWithText('Download', page)
    const menuItemText = isPivotTable ? 'HTML (.html)' : 'Image (.png)'
    await clickHoverMenuItemWithText(menuItemText, page)
    // Capture the window the download is in
    const fileDownloadTarget = await browser.waitForTarget((target) =>
        isPivotTable
            ? target.url().includes('/analytics.html+css')
            : target.url().startsWith('blob:')
    )

    if (isPivotTable) {
        const downloadPage = await fileDownloadTarget.page()
        if (!downloadPage) {
            throw new Error('Could not find tab with HTML and CSS output')
        }
        const html =
            (await downloadPage.evaluate(
                () => document.querySelector('body')?.innerHTML
            )) ?? ''
        const css =
            (await downloadPage.evaluate(
                () => document.querySelector('style')?.innerHTML
            )) ?? ''
        return { html, css }
    } else {
        return 'Not done yet'
    }

    // // Confirm download view is open by verifying this button's visibility
    // await page.waitForXPath(
    //     "//button[contains(text(), 'Exit download mode')]",
    //     { visible: true }
    // )
    // // Some additional tiles may need to be fetched for the download view
    // page.waitForNetworkIdle()

    // /* TODO: figure out a better solution than simply waiting.
    //  * We need the map to be ready and this takes time.
    //  * How much time is probably dependant on the host machine's
    //  * specs. On my machine waiting any less than 1000ms produces
    //  * maps that have not fully rendered. Obviously this could
    //  * be vastly different on another machine, so we need to
    //  * detect it some other way. */
    // await waitMs(1600)
    // // Click the next download button to trigger the actual download
    // await clickButtonWithText('Download', page)
    // // Wait until the file has downloaded and get the full path
    // const fullFilePath = await waitForFileToDownload(downloadDir)
    // // Convert to base64 encoded string
    // const base64Str = base64EncodeFile(fullFilePath)
    // // Show some progress so it's clear the process is not hanging
    // logImageConversion('map', fullFilePath)

    // return `<img src="data:image/png;base64,${base64Str}"></img>`
    return `<pre>${JSON.stringify(dashboardItem, null, 4)}</pre>`
}
