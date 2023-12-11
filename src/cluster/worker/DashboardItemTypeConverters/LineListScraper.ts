import { insertIntoLineListTemplate } from '../../../templates'
import { createTimer, logDashboardItemConversion } from '../../../utils'
import { ConverterResultObject, QueueItem } from '../../types'
import { DashboardItemScraper } from './DashboardItemScraper'

const DONWLOAD_PAGE_URL_PATTERN =
    /api\/analytics\/enrollments|events\/query\/[a-zA-Z0-9]{11}\.html\+css/

export class LineListScraper extends DashboardItemScraper<ConverterResultObject> {
    async convert(queueItem: QueueItem) {
        const eventVisualization = queueItem?.dashboardItem.eventVisualization

        if (!eventVisualization) {
            throw new Error(
                'function `scrapeLineListHtml` received a `dashboardItem` without an `eventVisualization` object'
            )
        }

        const { id, name, type } = eventVisualization

        if (type !== 'LINE_LIST') {
            /* We only support line lists, return an empty
             * string as we do for other unsupported types */
            return Promise.resolve({ html: '', css: '' })
        }
        const timer = createTimer()
        await this.page.bringToFront()

        /* Customise the window.open method so that when the app opens the HTML+CSS
         * in a new tab, the page URL has the correct query params for a pageSize of
         * 50 instead of disabling paging. We do not want thousands of rows in an
         * email and we don't want to put pressure on the server by requesting them.
         * NOTE: currently we are not restoring the original window and this is not
         * causing any problems */
        await this.page.evaluateOnNewDocument((regexJsonStr) => {
            const regexObj = JSON.parse(regexJsonStr)
            const regex = new RegExp(regexObj.source, regexObj.flags)

            const originalWindowOpen = window.open

            window.open = (...args) => {
                const url =
                    (args[0] instanceof URL ? args[0].toString() : args[0]) ??
                    ''

                if (regex.test(url)) {
                    args[0] = url.replace(
                        '&paging=false&',
                        '&paging=true&pageSize=50&'
                    )
                }

                return originalWindowOpen(...args)
            }
        }, JSON.stringify({ flags: DONWLOAD_PAGE_URL_PATTERN.flags, source: DONWLOAD_PAGE_URL_PATTERN.source }))

        // Open app and wait until network traffic stops
        await this.navigateToItem(id)

        // Wait for key HTML element to be visible
        await this.page.waitForSelector('table[data-test="line-list-table"]', {
            visible: true,
        })
        // Open download dropdown and select correct download type
        await this.clickElementWithText({
            xpath: 'button',
            text: 'Download',
        })
        await this.clickElementWithText({
            xpath: 'li/span',
            text: 'HTML+CSS (.html+css)',
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
        // Navigate home to clear the page
        await this.page.goto(this.appUrl)
        await downloadPage.close()
        // Log something for a sense of progress
        logDashboardItemConversion('line-list', name, timer.getElapsedTime())

        return { html: insertIntoLineListTemplate(name, tableHtml), css }
    }
}
