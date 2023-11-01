import type { ConverterFn } from '../types'
import { createTimer } from '../utils'
import { insertIntoLineListTemplate } from '../templates'
import { logDashboardItemConversion } from '../utils/logDashboardItemConversion'
import { clickButtonWithText } from './clickButtonWithText'
import { clickHoverMenuItemWithText } from './clickHoverMenuItemWithText'

const DONWLOAD_PAGE_URL_PATTERN =
    /api\/analytics\/enrollments|events\/query\/[a-zA-Z0-9]{11}\.html\+css/

export const getLineListHtml: ConverterFn = async (
    dashboardItem,
    page,
    browser
) => {
    if (!dashboardItem.eventVisualization) {
        throw new Error(
            'function `getLineListHtml` received a `dashboardItem` without an `eventVisualization` object'
        )
    }

    const { id, name, type } = dashboardItem.eventVisualization

    if (type !== 'LINE_LIST') {
        // We only support line lists
        return Promise.resolve('')
    }
    const timer = createTimer()

    /* Customise the window.open method so that when the app opens the HTML+CSS
     * in a new tab, the page URL has the correct query params for a pageSize of
     * 50 instead of disabling paging. We do not want thousands of rows in an
     * email and we don't want to put pressure on the server by requesting them.
     * NOTE: currently we are not restoring the original window and this is not
     * causing any problems */
    await page.evaluateOnNewDocument((regexJsonStr) => {
        const regexObj = JSON.parse(regexJsonStr)
        const regex = new RegExp(regexObj.source, regexObj.flags)

        const originalWindowOpen = window.open

        window.open = (...args) => {
            const url =
                (args[0] instanceof URL ? args[0].toString() : args[0]) ?? ''

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
    await page.gotoPath(`api/apps/line-listing/index.html#/${id}`, {
        waitUntil: 'networkidle2',
    })

    // Wait for key HTML element to be visible
    await page.waitForSelector('table[data-test="line-list-table"]', {
        visible: true,
    })
    // Open download dropdown and select correct download type
    await clickButtonWithText('Download', page)
    await clickHoverMenuItemWithText('HTML+CSS (.html+css)', page)

    // Get the page target which will render the HTML + CSS
    const downloadTarget = await browser.waitForTarget((target) =>
        DONWLOAD_PAGE_URL_PATTERN.test(target.url())
    )
    const downloadPage = await downloadTarget.page()

    if (!downloadPage) {
        throw new Error(`Could not find tab with HTML + CSS table`)
    }

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
    await page.bringToFront()
    await downloadPage.close()
    // Log something for a sense of progress
    logDashboardItemConversion('line-list', name, timer.getElapsedTime())

    return { html: insertIntoLineListTemplate(name, tableHtml), css }
}
