import type { Converter, QueueItem } from '../../types'

export class AnchorParser implements Converter<string> {
    #baseUrl: string

    constructor(baseUrl: string) {
        this.#baseUrl = baseUrl
    }

    get baseUrl() {
        return this.#baseUrl
    }

    async convert(queueItem: QueueItem): Promise<string> {
        throw new Error(
            `Parser not implemented for dashboard item type "${queueItem.dashboardItem.type}"`
        )
    }
}
