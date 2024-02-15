export type DashboardItemType =
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

type BaseVisualizationType =
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

export type VisualizationType = BaseVisualizationType | 'OUTLIER_TABLE'
export type EventVisualizationType = BaseVisualizationType | 'LINE_LIST'

export type ReportType = 'HTML' | 'JASPER_REPORT_TABLE' | 'JASPER_JDBC'

export type Dhis2Map = {
    id: string
    name: string
    type: undefined
}

export type Visualization = {
    id: string
    name: string
    type: VisualizationType
}

export type EventVisualization = {
    id: string
    name: string
    type: EventVisualizationType
}

export type EventReport = {
    id: string
    name: string
    type: EventVisualizationType
}

export type EventChart = {
    id: string
    name: string
    type: EventVisualizationType
}

export type Report = {
    id: string
    name: string
    type: ReportType
}

export type Resource = {
    id: string
    name: string
}

export type DashboardItem = {
    id: string
    type: DashboardItemType
    x: number
    y: number
    eventChart?: EventChart
    eventReport?: EventReport
    eventVisualization?: EventVisualization
    map?: Dhis2Map
    text?: string
    visualization?: Visualization
    reports?: Report[]
    resources?: Resource[]
}

export type AnyVisualization =
    | EventChart
    | EventReport
    | EventVisualization
    | Dhis2Map
    | Visualization

export type Dashboard = {
    displayName: string
    itemCount: number
    dashboardItems: DashboardItem[]
}
