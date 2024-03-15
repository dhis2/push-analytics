import type { ConverterResult, DashboardItem } from '../types'

// Conversions should not take longer than 60 seconds
const MAX_CONVERSION_TIME = 60 * 1000

export class HtmlCollector {
    #itemsHtml: Map<string, ConverterResult>
    #convertedItemsCount: number
    #conversionTimeout: NodeJS.Timeout

    constructor(dashboardItems: DashboardItem[], onConversionTimeout: () => void) {
        this.#convertedItemsCount = 0
        this.#itemsHtml = dashboardItems.reduce((itemsHtml, dashboardItem) => {
            itemsHtml.set(dashboardItem.id, { html: '', css: '' })
            return itemsHtml
        }, new Map())
        this.#conversionTimeout = setTimeout(onConversionTimeout, MAX_CONVERSION_TIME)
    }

    addDashboardItemHtml(dashboardItemId: string, converterResult: ConverterResult) {
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

    clearConversionTimeout() {
        clearTimeout(this.#conversionTimeout)
    }
}
