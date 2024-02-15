import { isConditionMatchForDashboardItem } from '.'
import type { DashboardItem, SelectorConditions, Step } from '../../types'

export function pickConditionalSelectorForDashboardItem(
    conditions: SelectorConditions,
    dashboardItem: DashboardItem
): Pick<Step, 'waitForSelector'> {
    const condition = conditions.find((condition) =>
        isConditionMatchForDashboardItem(condition, dashboardItem)
    )

    if (!condition?.selector) {
        throw new Error(
            `Could identify conditional for selector dashboard item of type ${dashboardItem.type}`
        )
    }

    return { waitForSelector: condition?.selector }
}
