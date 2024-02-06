import {
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
    return condition.value.includes(',') && typeof itemValue === 'string'
        ? condition.value.includes(itemValue)
        : condition.value === itemValue
}
