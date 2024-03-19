import type {
    AnyVisualization,
    DashboardItem,
    Dhis2Map,
    EventChart,
    EventReport,
    EventVisualization,
    Visualization,
} from '../../types'
import { AppScraperError } from './AppScraperError'

export function getDashboardItemVisualization(
    dashboardItem: DashboardItem
): AnyVisualization {
    switch (dashboardItem.type) {
        case 'EVENT_CHART':
            return dashboardItem.eventChart as EventChart
        case 'EVENT_REPORT':
            return dashboardItem.eventReport as EventReport
        case 'EVENT_VISUALIZATION':
            return dashboardItem.eventVisualization as EventVisualization
        case 'MAP':
            return dashboardItem.map as Dhis2Map
        case 'VISUALIZATION':
            return dashboardItem.visualization as Visualization
        default:
            throw new AppScraperError(`Received unsupported type ${dashboardItem.type}`)
    }
}
