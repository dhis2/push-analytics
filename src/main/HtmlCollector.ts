import { ConverterResult, DashboardItem } from '../types'

export class HtmlCollector {
    #itemsHtml: Map<string, ConverterResult>
    #convertedItemsCount: number

    constructor(dashboardItems: DashboardItem[]) {
        this.#convertedItemsCount = 0
        this.#itemsHtml = dashboardItems.reduce((itemsHtml, dashboardItem) => {
            itemsHtml.set(dashboardItem.id, { html: '', css: '' })
            return itemsHtml
        }, new Map())
    }

    addDashboardItemHtml(
        dashboardItemId: string,
        converterResult: ConverterResult
    ) {
        if (!this.#itemsHtml.has(dashboardItemId)) {
            throw new Error(
                `Provided dashboard item ID "${dashboardItemId}" not found in HTML collection`
            )
        }

        ++this.#convertedItemsCount
        this.#itemsHtml.set(dashboardItemId, converterResult)
    }

    isComplete() {
        return this.#convertedItemsCount === this.#itemsHtml.size
    }

    combineItemsHtml(): ConverterResult {
        return Array.from(this.#itemsHtml.values()).reduce(
            (acc, result: ConverterResult) => {
                acc.html += result.html
                if (result.css && !acc.css.includes(result.css)) {
                    acc.css += result.css
                }
                return acc
            },
            {
                html: '',
                css: '',
            }
        )
    }
}
