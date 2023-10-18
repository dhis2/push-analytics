import { getDashboard } from './httpGetClient'
import {
    clearDownloadDir,
    groupDashboardItemsByType,
    insertIntoEmailTemplate,
} from './utils'
import { createAuthenticatedBrowserPage } from './puppeteer'

type Options = {
    apiVersion: string
    baseUrl: string
    dashboardId: string
    password: string
    username: string
}

export const convertDashboardToEmailHtml = async ({
    apiVersion,
    baseUrl,
    dashboardId,
    password,
    username,
}: Options) => {
    const startTimestamp = Date.now()
    console.log('Dashboard to email generation started')
    const htmlSnippets: Record<string, string> = {}
    const { browser, page } = await createAuthenticatedBrowserPage({
        baseUrl,
        username,
        password,
        debug: false,
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
                page
            )
        }
    }
    const dashboardHtml = dashboardItems.reduce((html, { id }) => {
        html += htmlSnippets[id] + ''
        return html
    }, `<h1>${displayName}</h1>`)

    await browser.close()
    await clearDownloadDir()

    const duration = ((Date.now() - startTimestamp) / 1000).toFixed(2)
    console.log(`Process completed in ${duration} seconds`)

    return insertIntoEmailTemplate(dashboardHtml)
}
