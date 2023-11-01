import { groupDashboardItemsByType } from './groupDashboardItemsByType'
import { getDashboard } from './httpGetClient'
import { clearDownloadDir, createTimer } from './utils'
import { createAuthenticatedBrowserPage } from './puppeteer'
import { insertIntoEmailTemplate } from './templates'
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
    const timer = createTimer()
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
                if (htmlSnippet.css && !acc.css.includes(htmlSnippet.css)) {
                    acc.css += htmlSnippet.css
                }
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

    console.log(
        `Dashboard email HTML generated in ${timer.getElapsedTime()} seconds`
    )

    return insertIntoEmailTemplate(html, css)
}
