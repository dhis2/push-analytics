// Only use global type definitions for shared types
type VisualizationType =
    | 'COLUMN'
    | 'STACKED_COLUMN'
    | 'BAR'
    | 'STACKED_BAR'
    | 'LINE'
    | 'AREA'
    | 'STACKED_AREA'
    | 'PIE'
    | 'RADAR'
    | 'GAUGE'
    | 'YEAR_OVER_YEAR_LINE'
    | 'YEAR_OVER_YEAR_COLUMN'
    | 'SCATTER'
    | 'BUBBLE'
    | 'SINGLE_VALUE'
    | 'PIVOT_TABLE'

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

type Dhis2Map = {
    id: string
    name: string
}

type Visualization = {
    id: string
    name: string
    type: VisualizationType
}

type DashboardItem = {
    id: string
    type: DashboardItemType
    visualization?: Visualization
    map?: Dhis2Map
}

type Dashboard = {
    displayName: string
    itemCount: number
    dashboardItems: DashboardItem[]
}
