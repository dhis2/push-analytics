import type { ConverterFn, ConverterResult } from '../types'
import { insertIntoChartTemplate } from '../utils/insertIntoChartTemplate'
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
    let result: ConverterResult = ''
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

    const downloadPage = await fileDownloadTarget.page()
    if (!downloadPage) {
        throw new Error(
            `Could not find tab with ${
                isPivotTable ? 'HTML table' : 'PNG file'
            }`
        )
    }

    if (isPivotTable) {
        const html =
            (await downloadPage.evaluate(
                () => document.querySelector('body')?.innerHTML
            )) ?? ''
        const css =
            (await downloadPage.evaluate(
                () => document.querySelector('style')?.innerHTML
            )) ?? ''

        result = { html, css }
    } else {
        const img = await downloadPage.waitForSelector('img')
        const base64 = await img?.screenshot({ encoding: 'base64' })
        const base64Str = Buffer.isBuffer(base64)
            ? base64.toString()
            : base64 ?? ''
        result = insertIntoChartTemplate(name, base64Str)
    }

    // Close the download tab and make sure the main tab is activated
    await page.bringToFront()
    await downloadPage.close()
    // Log something for a sense of progress
    console.log(`Converted ${isPivotTable ? 'pivot table' : 'chart'} "${name}"`)

    return result
}
