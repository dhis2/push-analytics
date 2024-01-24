import {
    insertIntoDashboardHeaderTemplate,
    insertIntoEmailTemplate,
} from '../templates'
import {
    ConverterResult,
    OnConversionCompleteFn,
} from '../types/ConverterCluster'

type Options = {
    baseUrl: string
    dashboardId: string
    displayName: string
    onComplete: OnConversionCompleteFn
}

export class DashboardHtmlBuilder {
    #baseUrl: string
    #dashboardId: string
    #displayName: string
    #items: Map<string, { html: string; css: string }>
    #completedCount: number
    #onComplete: OnConversionCompleteFn

    constructor({ baseUrl, dashboardId, displayName, onComplete }: Options) {
        this.#baseUrl = baseUrl
        this.#dashboardId = dashboardId
        this.#displayName = displayName
        this.#items = new Map()
        this.#completedCount = 0
        this.#onComplete = onComplete
    }

    public createItem(dashboardItemId: string) {
        this.#items.set(dashboardItemId, { html: '', css: '' })
    }

    public addItemHtml(
        dashboardItemId: string,
        html: string | { html: string; css: string }
    ) {
        this.#items.set(
            dashboardItemId,
            typeof html === 'string' ? { html, css: '' } : html
        )

        ++this.#completedCount

        if (this.#completedCount === this.#items.size) {
            const { html, css } = Array.from(this.#items.values()).reduce(
                (acc, result: ConverterResult) => {
                    if (!result || typeof result === 'string') {
                        acc.html += result ?? ''
                    } else {
                        acc.html += result.html ?? ''
                        if (result.css && !acc.css.includes(result.css)) {
                            acc.css += result.css
                        }
                    }
                    return acc
                },
                {
                    html: insertIntoDashboardHeaderTemplate(
                        this.#baseUrl,
                        this.#dashboardId,
                        this.#displayName
                    ),
                    css: '',
                }
            )
            this.#onComplete(insertIntoEmailTemplate(html, css))
        }
    }
}
