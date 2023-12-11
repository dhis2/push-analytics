import { insertIntoEventReportTemplate } from '../../../templates'
import { createTimer, logDashboardItemConversion } from '../../../utils'
import { ConverterResultObject, QueueItem } from '../../types'
import { DashboardItemScraper } from './DashboardItemScraper'

// const DONWLOAD_PAGE_URL_PATTERN =
//     /api\/[0-9]{1,3}\/analytics\/events\/aggregate\/[a-zA-Z0-9]{11}\.html\+css/

export class EventReportScraper extends DashboardItemScraper<ConverterResultObject> {
    async convert(queueItem: QueueItem) {
        const eventReport = queueItem?.dashboardItem.eventReport
        if (!eventReport) {
            throw new Error(
                'function `scrapeEventReportHtml` received a `dashboardItem` without a `eventReport` object'
            )
        }
        const timer = createTimer()
        await this.page.bringToFront()

        const { id, name } = eventReport

        // Open app and wait until network traffic stops
        await this.navigateToItem(id)

        // Wait for key HTML element to be visible
        await this.page.waitForSelector('table.pivot', { visible: true })
        // Open download dropdown and select correct download type
        await this.clickElementWithText({
            xpath: 'button/span',
            text: 'Download',
        })
        await this.clickElementWithText({
            xpath: 'a/span',
            text: 'HTML (.html)',
        })

        // Get the page target which will render the HTML + CSS
        const downloadPage = await this.getDownloadPage(id)

        // Get the relavant HTML and CSS from the page
        const tableHtml =
            (await downloadPage.evaluate(
                () => document.querySelector('body')?.innerHTML
            )) ?? ''
        const css =
            (await downloadPage.evaluate(
                () => document.querySelector('style')?.innerHTML
            )) ?? ''

        // Close the download tab and make sure the main tab is activated
        await this.page.bringToFront()
        await this.#clearPage()
        await downloadPage.close()
        // Log something for a sense of progress
        logDashboardItemConversion(
            'event-reports',
            name,
            timer.getElapsedTime()
        )

        return { html: insertIntoEventReportTemplate(name, tableHtml), css }
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
