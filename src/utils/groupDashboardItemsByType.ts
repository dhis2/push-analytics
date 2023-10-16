import { Page } from 'puppeteer'

type DashboardItemGroup = {
    dashboardItems: DashboardItem[]
    converter: (dashboardItem: DashboardItem, page: Page) => Promise<string>
}

const defaultConverter = async (dashboardItem: DashboardItem) =>
    Promise.resolve(
        `<h1>Converter not implemented for type "${dashboardItem.type}" (ID: ${dashboardItem.id})</h1>`
    )

export const groupDashboardItemsByType = (dashboardItems: DashboardItem[]) =>
    dashboardItems.reduce<Record<DashboardItemType, DashboardItemGroup>>(
        (acc, dashboardItem) => {
            acc[dashboardItem.type].dashboardItems.push(dashboardItem)
            return acc
        },
        {
            VISUALIZATION: { dashboardItems: [], converter: defaultConverter },
            EVENT_VISUALIZATION: {
                dashboardItems: [],
                converter: defaultConverter,
            },
            EVENT_CHART: { dashboardItems: [], converter: defaultConverter },
            MAP: { dashboardItems: [], converter: defaultConverter },
            EVENT_REPORT: { dashboardItems: [], converter: defaultConverter },
            USERS: { dashboardItems: [], converter: defaultConverter },
            REPORTS: { dashboardItems: [], converter: defaultConverter },
            RESOURCES: { dashboardItems: [], converter: defaultConverter },
            TEXT: { dashboardItems: [], converter: defaultConverter },
            MESSAGES: { dashboardItems: [], converter: defaultConverter },
            APP: { dashboardItems: [], converter: defaultConverter },
        }
    )