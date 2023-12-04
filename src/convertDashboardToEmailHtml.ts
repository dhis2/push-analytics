import { groupDashboardItemsByType } from './groupDashboardItemsByType'
import { getDashboard } from './httpGetClient'
import { clearDownloadDir, createTimer } from './utils'
import { createAuthenticatedBrowserPage } from './puppeteer-utils'
import { insertIntoEmailTemplate } from './templates'
import { ConverterResult } from './types'
import { mergeDashboardItemHtmlAndCss } from './mergeDashboardItemHtmlAndCss'
// import { convertDashboardItems } from './converterPool'

// type Options = {
//     apiVersion: string
//     baseUrl: string
//     dashboardId: string
//     password: string
//     username: string
//     debug?: boolean
// }

// export const convertDashboardToEmailHtml = async ({
//     apiVersion,
//     baseUrl,
//     dashboardId,
//     password,
//     username,
//     debug = false,
// }: Options) => {
//     const timer = createTimer()
//     console.log('Dashboard to email generation started')
//     const htmlSnippets: Record<string, ConverterResult> = {}
//     const { browser, page } = await createAuthenticatedBrowserPage({
//         baseUrl,
//         username,
//         password,
//         debug,
//     })
//     const { displayName, dashboardItems } = await getDashboard(
//         apiVersion,
//         baseUrl,
//         dashboardId,
//         password,
//         username
//     )
//     const dashboardItemsPerType = groupDashboardItemsByType(dashboardItems)

//     for (const { converter, dashboardItems } of Object.values(
//         dashboardItemsPerType
//     )) {
//         for (const dashboardItem of dashboardItems) {
//             htmlSnippets[dashboardItem.id] = await converter(
//                 dashboardItem,
//                 page,
//                 browser
//             )
//         }
//     }
//     const { html, css } = mergeDashboardItemHtmlAndCss({
//         dashboardItems,
//         htmlSnippets,
//         baseUrl,
//         dashboardId,
//         displayName,
//     })

//     if (!debug) {
//         await browser.close()
//         await clearDownloadDir()
//     }

//     console.log(
//         `Dashboard email HTML generated in ${timer.getElapsedTime()} seconds`
//     )

//     return insertIntoEmailTemplate(html, css)
// }

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
    const { displayName, dashboardItems } = await getDashboard(
        apiVersion,
        baseUrl,
        dashboardId,
        password,
        username
    )
    // convertDashboardItems(dashboardItems)
}
