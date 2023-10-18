import { getDashboard } from './httpGetClient'
import {
    clearDownloadDir,
    groupDashboardItemsByType,
    insertIntoEmailTemplate,
} from './utils'
import { createAuthenticatedBrowserPage } from './puppeteer'
import { ConverterResult } from './types'

type Options = {
    apiVersion: string
    baseUrl: string
    dashboardId: string
    password: string
    username: string
    debug?: boolean
}

export const convertDashboardToEmailHtml = async ({
    apiVersion,
    baseUrl,
    dashboardId,
    password,
    username,
    debug = false,
}: Options) => {
    const startTimestamp = Date.now()
    console.log('Dashboard to email generation started')
    const htmlSnippets: Record<string, ConverterResult> = {}
    const { browser, page } = await createAuthenticatedBrowserPage({
        baseUrl,
        username,
        password,
        debug,
    })
    const { displayName, dashboardItems } = await getDashboard(
        apiVersion,
        baseUrl,
        dashboardId,
        password,
        username
    )
    const dashboardItemsPerType = groupDashboardItemsByType(dashboardItems)

    for (const { converter, dashboardItems } of Object.values(
        dashboardItemsPerType
    )) {
        for (const dashboardItem of dashboardItems) {
            htmlSnippets[dashboardItem.id] = await converter(
                dashboardItem,
                page,
                browser
            )
        }
    }
    const { html, css } = dashboardItems.reduce(
        (acc, { id }) => {
            const htmlSnippet = htmlSnippets[id]

            if (!htmlSnippet || typeof htmlSnippet === 'string') {
                acc.html += htmlSnippet ?? ''
            } else {
                acc.html += htmlSnippet.html ?? ''
                acc.css += htmlSnippet.css ?? ''
            }
            return acc
        },
        {
            html: `<h1>${displayName}</h1>`,
            css: '',
        }
    )

    if (!debug) {
        await browser.close()
        await clearDownloadDir()
    }

    const duration = ((Date.now() - startTimestamp) / 1000).toFixed(2)
    console.log(`Process completed in ${duration} seconds`)

    return insertIntoEmailTemplate(html, css)
}
