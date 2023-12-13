import cluster from 'node:cluster'
import type {
    AddDashboardOptions,
    ConversionRequestMessage,
    ConversionResultMessage,
    ConvertedItem,
    QueueItem,
} from '../types/ConverterCluster'
import { getThreadLength } from '../utils'
import { DashboardsHtmlStore } from './DashboardsHtmlStore'

export class DashboardsConverter {
    #baseUrl: string
    #dashboardsHtmlStore: DashboardsHtmlStore
    #dashboardItemsQueue: QueueItem[]
    #idleWorkerIds: Set<number>

    constructor(baseUrl: string) {
        this.#baseUrl = baseUrl
        this.#dashboardsHtmlStore = new DashboardsHtmlStore()
        this.#dashboardItemsQueue = []
        this.#idleWorkerIds = new Set()
        this.#createWorkers()
    }

    public addDashboard({
        dashboardId,
        username,
        password,
        displayName,
        dashboardItems,
        onComplete,
    }: AddDashboardOptions) {
        const dashboardHtmlCollection =
            this.#dashboardsHtmlStore.createDashboardHtmlCollection({
                baseUrl: this.#baseUrl,
                username,
                dashboardId,
                displayName,
                onComplete,
            })
        dashboardItems
            .sort(
                (itemA, itemB) =>
                    (itemA.y ?? 0) - (itemB.y ?? 0) ||
                    (itemA.x ?? 0) - (itemB.x ?? 0)
            )
            .forEach((dashboardItem) => {
                dashboardHtmlCollection.createItem(dashboardItem.id)
                this.#dashboardItemsQueue.push({
                    dashboardId,
                    dashboardItem,
                    username,
                    password,
                })
            })
        this.#notifyIdleWorkers()
    }

    #addDashboardItemHtml({
        dashboardId,
        username,
        dashboardItemId,
        html = '',
    }: ConvertedItem) {
        const dashboardHtmlCollection =
            this.#dashboardsHtmlStore.getDashboardHtmlCollection(
                dashboardId,
                username
            )

        if (!dashboardHtmlCollection) {
            throw new Error(
                `Could not find "dashboardHtmlCollection" for dashboard ${dashboardId}`
            )
        }

        dashboardHtmlCollection.addItemHtml(dashboardItemId, html)
    }

    #takeItemFromQueue() {
        // Take from the start
        return this.#dashboardItemsQueue.shift()
    }

    #createWorkers() {
        const threadLength = getThreadLength()
        for (let i = 0; i < threadLength; i++) {
            const worker = cluster.fork()
            this.#idleWorkerIds.add(worker.id)
            worker.on('message', (message: ConversionResultMessage) => {
                if (
                    message.type !== 'ITEM_CONVERSION_RESULT' ||
                    !message.payload
                ) {
                    throw new Error(
                        `Received unexpected message with type "${message?.type}" from worker with ID "${worker.id}"`
                    )
                }
                this.#addDashboardItemHtml(message.payload as ConvertedItem)
                const nextItem = this.#takeItemFromQueue()
                if (nextItem) {
                    const message: ConversionRequestMessage = {
                        type: 'ITEM_CONVERSION_REQUEST',
                        payload: nextItem,
                    }
                    worker.send(message)
                } else {
                    this.#idleWorkerIds.add(worker.id)
                }
            })
        }
    }

    #notifyIdleWorkers() {
        for (const workerId of this.#idleWorkerIds) {
            const worker = cluster.workers?.[workerId]

            if (!worker) {
                throw new Error('Could not get idle worker')
            }

            const queueItem = this.#takeItemFromQueue()

            if (!queueItem) {
                return
            }

            worker.send({
                type: 'ITEM_CONVERSION_REQUEST',
                payload: queueItem,
            } as ConversionRequestMessage)
        }
    }
}
