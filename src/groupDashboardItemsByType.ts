import {
    getEventReportHtml,
    getLineListHtml,
    getMapHtml,
    getVisualizationHtml,
} from './puppeteer'
import type {
    DashboardItem,
    DashboardItemGroup,
    DashboardItemType,
} from './types'

const debugConverter = async (dashboardItem: DashboardItem) => {
    // console.log(dashboardItem)
    return Promise.resolve(
        `<h1>Converter not implemented for type "${dashboardItem.type}" (ID: ${dashboardItem.id})</h1>`
    )
}

// Just return an empty string for dashboard item types we do not want in emails
const unsupportedTypeConverter = async () => Promise.resolve('')

export const groupDashboardItemsByType = (dashboardItems: DashboardItem[]) =>
    dashboardItems.reduce<Record<DashboardItemType, DashboardItemGroup>>(
        (acc, dashboardItem) => {
            acc[dashboardItem.type].dashboardItems.push(dashboardItem)
            return acc
        },
        {
            VISUALIZATION: {
                dashboardItems: [],
                converter: getVisualizationHtml,
            },
            EVENT_VISUALIZATION: {
                dashboardItems: [],
                /* A dashboard item of type `EVENT_VISUALIZATION` can have one of
                 * several event visualization types (i.e. `BAR`, `LINE_LIST`, etc.).
                 * However, the only one we realistically expect to encounter is the
                 * `LINE_LIST` type, so that is the only supported one. */
                converter: getLineListHtml,
            },
            EVENT_CHART: { dashboardItems: [], converter: debugConverter },
            MAP: { dashboardItems: [], converter: getMapHtml },
            EVENT_REPORT: { dashboardItems: [], converter: getEventReportHtml },
            USERS: { dashboardItems: [], converter: unsupportedTypeConverter },
            REPORTS: { dashboardItems: [], converter: debugConverter },
            RESOURCES: { dashboardItems: [], converter: debugConverter },
            TEXT: { dashboardItems: [], converter: debugConverter },
            MESSAGES: {
                dashboardItems: [],
                converter: unsupportedTypeConverter,
            },
            APP: { dashboardItems: [], converter: unsupportedTypeConverter },
        }
    )
