import { PushAnalyticsError } from '../PushAnalyticsError'
import type { AddDashboardOptions, QueueItem } from '../types'

class DashboardItemsQueueError extends PushAnalyticsError {
    constructor(
        message: string,
        errorCode: string = 'E1201',
        httpResponseStatusCode: number = 500
    ) {
        super(message, errorCode, httpResponseStatusCode)
    }
}

export class DashboardItemsQueue {
    #dashboardItemsQueue: QueueItem[]

    constructor() {
        this.#dashboardItemsQueue = []
    }

    takeItemFromQueue() {
        // Take from the start
        const queueItem = this.#dashboardItemsQueue.shift()

        if (!queueItem) {
            throw new DashboardItemsQueueError('Failed to get item from empty queue')
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

    clearQueue() {
        this.#dashboardItemsQueue = []
    }

    removeItemsByRequestId(requestId: number) {
        this.#dashboardItemsQueue = this.#dashboardItemsQueue.filter(
            (queueItem) => queueItem.requestId !== requestId
        )
    }
}
