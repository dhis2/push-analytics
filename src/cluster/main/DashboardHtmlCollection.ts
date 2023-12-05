import { OnCompleteFn } from '../types'

export class DashboardHtmlCollection {
    #items: Map<string, { html: string; css: string }>
    #completedCount: number
    #displayName: string
    #onComplete: OnCompleteFn

    constructor(displayName: string, onComplete: OnCompleteFn) {
        this.#items = new Map()
        this.#completedCount = 0
        this.#displayName = displayName
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
            this.#onComplete('<h1>All the combined HTML</h1>')
        }
    }
}
