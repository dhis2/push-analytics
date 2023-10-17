import { getDashboard } from './httpGetClient'
import { groupDashboardItemsByType } from './utils/groupDashboardItemsByType'
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
    const htmlSnippets: Record<string, string> = {}
    const page = await createAuthenticatedBrowserPage({
        baseUrl,
        username,
        password,
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
    return dashboardItems.reduce((html, { id }) => {
        html += htmlSnippets[id] + ''
        return html
    }, `<h1>${displayName}</h1>`)
}
