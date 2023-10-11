type DashboardItemType =
    | 'VISUALIZATION'
    | 'EVENT_VISUALIZATION'
    | 'EVENT_CHART'
    | 'MAP'
    | 'EVENT_REPORT'
    | 'USERS'
    | 'REPORTS'
    | 'RESOURCES'
    | 'TEXT'
    | 'MESSAGES'
    | 'APP'

type DashboardToEmailConverterOptions = {
    dhis2CoreUrl: string
    dhis2CoreMajorVersion: string
    dhis2CoreUsername: string
    dhis2CorePassword: string
}

type Visualization = {
    id: string
    name: string
    type: string
}

type DashboardItem = {
    id: string
    type: DashboardItemType
    visualization?: Visualization
}

type Dashboard = {
    displayName: string
    itemCount: number
    dashboardItems: DashboardItem[]
}
