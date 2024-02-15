import type {
    ConditionalDownloadInstructions,
    DashboardItem,
    SelectorCondition,
} from '../../types'
import { getNestedPropertyValue } from './getNestedPropertyValue'

export function isConditionMatchForDashboardItem(
    condition: SelectorCondition | ConditionalDownloadInstructions,
    dashboardItem: DashboardItem
): boolean {
    const itemValue = getNestedPropertyValue(
        dashboardItem,
        condition.dashboardItemProperty
    )
    return Array.isArray(condition.value)
        ? condition.value.some((currValue) => currValue === itemValue)
        : condition.value === itemValue
}
