import {
    insertIntoChartTemplate,
    insertIntoPivotTableTemplate,
} from '../templates'
import {
    ConverterResult,
    ConverterResultObject,
    QueueItem,
} from '../types/ConverterCluster'
import { createTimer, logDashboardItemConversion } from '../utils'
import { DashboardItemScraper } from './base/DashboardItemScraper'

export class VisualizationScraper extends DashboardItemScraper<ConverterResultObject> {
    async convert(queueItem: QueueItem) {
        const visualization = queueItem.dashboardItem?.visualization

        if (!visualization) {
            throw new Error(
                'function `scrapeVisualizationHtml` received a `dashboardItem` without a `visualization` object'
            )
        }
        const timer = createTimer()
        await this.page.bringToFront()
        const result: ConverterResult = {
            html: '',
            css: '',
        }
        const { id, name, type } = visualization
        const isPivotTable = type === 'PIVOT_TABLE'
        const visType = isPivotTable ? type : 'CHART'

        /* First visit the app without vis ID to ensure there is no chart on
         * the page. This is to prevent the app downloading the previous chart
         * instead of the current one */
        await this.clearVisualization()

        // Open app and wait until network traffic stops
        await this.navigateToItem(id)

        // Wait for key HTML element to be visible
        const selectorForType = isPivotTable
            ? '.pivot-table-container > table'
            : '.highcharts-container'
        await this.page.waitForSelector(selectorForType, { visible: true })
        // Open download dropdown and select correct download type
        await this.clickElementWithText({ xpath: 'button', text: 'Download' })
        const text = isPivotTable ? 'HTML (.html)' : 'Image (.png)'
        await this.clickElementWithText({ xpath: 'li/span', text })
        const downloadPage = await this.getDownloadPage(id)

        if (isPivotTable) {
            const tableHtml =
                (await downloadPage.evaluate(
                    () => document.querySelector('body')?.innerHTML
                )) ?? ''
            const css =
                (await downloadPage.evaluate(
                    () => document.querySelector('style')?.innerHTML
                )) ?? ''

            result.html = insertIntoPivotTableTemplate(name, tableHtml)
            result.css = css
        } else {
            const img = await downloadPage.waitForSelector('img')
            const base64 = await img?.screenshot({ encoding: 'base64' })
            const base64Str = Buffer.isBuffer(base64)
                ? base64.toString()
                : base64 ?? ''
            result.html = insertIntoChartTemplate(name, base64Str)
        }

        // Close the download tab and make sure the main tab is activated
        await downloadPage.close()
        await this.page.bringToFront()
        // Navigate home to clear the page
        await this.page.goto(this.appUrl)
        // Log something for a sense of progress
        logDashboardItemConversion(visType, name, timer.getElapsedTime())

        return result
    }
}
