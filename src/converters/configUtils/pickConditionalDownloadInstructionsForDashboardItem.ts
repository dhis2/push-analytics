import {
    ConditionalDownloadInstructions,
    DashboardItem,
    DownloadInstructions,
} from '../../types'
import { isConditionMatchForDashboardItem } from '.'

export function pickConditionalDownloadInstructionsForDashboardItem(
    conditions: ConditionalDownloadInstructions[],
    dashboardItem: DashboardItem
): DownloadInstructions {
    const condition = conditions.find((condition) =>
        isConditionMatchForDashboardItem(condition, dashboardItem)
    )

    if (!condition?.strategy) {
        throw new Error(
            `Could identify conditional download instructions for dashboard item of type ${dashboardItem.type}`
        )
    }

    return {
        strategy: condition.strategy,
        HtmlOutput: condition.HtmlOutput,
        openerUrl: condition.openerUrl,
        htmlSelector: condition.htmlSelector,
        cssSelector: condition.cssSelector,
        modifyDownloadUrl: condition.modifyDownloadUrl,
    }
}
