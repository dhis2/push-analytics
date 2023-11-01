import type { ConverterFn } from '../types'
import { createTimer } from '../utils'
import { insertIntoEventReportTemplate } from '../templates'
import { logDashboardItemConversion } from '../utils/logDashboardItemConversion'
import { clickElementWithText } from './clickElementWithText'

const DONWLOAD_PAGE_URL_PATTERN =
    /api\/[0-9]{1,3}\/analytics\/events\/aggregate\/[a-zA-Z0-9]{11}\.html\+css/

export const getEventReportHtml: ConverterFn = async (
    dashboardItem,
    page,
    browser
) => {
    if (!dashboardItem.eventReport) {
        throw new Error(
            'function `getEventReportHtml` received a `dashboardItem` without a `eventReport` object'
        )
    }
    const timer = createTimer()

    const { id, name } = dashboardItem.eventReport

    // Open app and wait until network traffic stops
    await page.gotoPath(`dhis-web-event-reports/?id=${id}`, {
        waitUntil: 'networkidle2',
    })

    // Wait for key HTML element to be visible
    await page.waitForSelector('table.pivot', { visible: true })
    // Open download dropdown and select correct download type
    await clickElementWithText({ xpath: 'button/span', text: 'Download', page })
    await clickElementWithText({ xpath: 'a/span', text: 'HTML (.html)', page })

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

    return { html: insertIntoEventReportTemplate(name, tableHtml), css }
}
