import { AddDashboardOptions, QueueItem } from '../types'

export class DashboardItemsQueue {
    #dashboardItemsQueue: QueueItem[]

    constructor() {
        this.#dashboardItemsQueue = []
    }

    takeItemFromQueue() {
        // Take from the start
        const queueItem = this.#dashboardItemsQueue.shift()

        if (!queueItem) {
            throw new Error(
                'Queue is empty, call `hasQueuedItems` before calling this method'
            )
        }

        return queueItem
    }

    addItemsToQueue({
        requestId,
        dashboardId,
        dashboardItems,
        username,
    }: AddDashboardOptions) {
        for (const dashboardItem of dashboardItems) {
            const queueItem: QueueItem = {
                requestId,
                dashboardId,
                dashboardItem,
                username,
            }
            // Add to the end
            this.#dashboardItemsQueue.push(queueItem)
        }
    }

    hasQueuedItems() {
        return this.#dashboardItemsQueue.length > 0
    }
}
