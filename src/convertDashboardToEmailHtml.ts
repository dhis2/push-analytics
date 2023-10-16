import { getDashboard } from './httpGetClient/getDashboard'
import { groupDashboardItemsByType } from './utils/groupDashboardItemsByType'
import { createHttpGetClient } from './httpGetClient/createHttpGetClient'
import { createBrowser, login } from './puppeteer'

type Options = {
    dashboardId: string
    baseUrl: string
    apiVersion: string
    username: string
    password: string
}

export const convertDashboardToEmailHtml = async ({
    dashboardId,
    baseUrl,
    apiVersion,
    username,
    password,
}: Options) => {
    const fetchData = createHttpGetClient({
        baseUrl,
        apiVersion,
        username,
        password,
    })
    const { displayName, dashboardItems } = await getDashboard(
        dashboardId,
        fetchData
    )
    const dashboardItemsPerType = groupDashboardItemsByType(dashboardItems)
    const browser = await createBrowser()
    const page = await browser.newPage()
    await login({ page, baseUrl, username, password })
    const htmlSnippets: Record<string, string> = {}
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
