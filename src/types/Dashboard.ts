import { Browser } from 'puppeteer'
import { PageWithRelativeNavigation } from './Puppeteer'

export type VisualizationType =
    | 'COLUMN'
    | 'STACKED_COLUMN'
    | 'BAR'
    | 'STACKED_BAR'
    | 'LINE'
    | 'AREA'
    | 'PIE'
    | 'RADAR'
    | 'GAUGE'
    | 'YEAR_OVER_YEAR_LINE YEAR_OVER_YEAR_COLUMN'
    | 'SINGLE_VALUE'
    | 'PIVOT_TABLE'

export type EventVisualizationType =
    | 'COLUMN'
    | 'STACKED_COLUMN'
    | 'BAR'
    | 'STACKED_BAR'
    | 'LINE'
    | 'LINE_LIST'
    | 'AREA'
    | 'STACKED_AREA'
    | 'PIE'
    | 'RADAR'
    | 'GAUGE'
    | 'YEAR_OVER_YEAR_LINE'
    | 'YEAR_OVER_YEAR_COLUMN'
    | 'SINGLE_VALUE'
    | 'PIVOT_TABLE'
    | 'SCATTER'
    | 'BUBBLE'

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

export type Dhis2Map = {
    id: string
    name: string
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

export type DashboardItem = {
    id: string
    type: DashboardItemType
    visualization?: Visualization
    map?: Dhis2Map
    eventVisualization?: EventVisualization
}

export type Dashboard = {
    displayName: string
    itemCount: number
    dashboardItems: DashboardItem[]
}

export type ConverterResult = string | { html: string; css: string }

export type ConverterFn = (
    dashboardItem: DashboardItem,
    page: PageWithRelativeNavigation,
    browser: Browser
) => Promise<ConverterResult>

export type DashboardItemGroup = {
    dashboardItems: DashboardItem[]
    converter: ConverterFn
}
