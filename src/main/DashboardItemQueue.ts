import { AddDashboardOptions, QueueItem } from '../types'

export class DashboardItemsQueue {
    #dashboardItemsQueue: QueueItem[]
    constructor() {
        this.#dashboardItemsQueue = []
    }

    takeItemFromQueue() {
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

    isEmpty() {
        return this.#dashboardItemsQueue.length === 0
    }

    hasQueuedItems() {
        return !this.isEmpty()
    }
}
