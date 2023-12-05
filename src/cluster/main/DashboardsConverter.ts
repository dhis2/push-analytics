import cluster from 'node:cluster'
import { getThreadLength } from '../../utils'
import type {
    AddDashboardOptions,
    ConvertedItem,
    QueueItem,
    ConverterReadyMessage,
    ConversionRequestMessage,
    ConversionResultMessage,
} from '../types'
import { DashboardsHtmlStore } from './DashboardsHtmlStore'

export class DashboardsConverter {
    #dashboardsHtmlStore: DashboardsHtmlStore
    #dashboardItemsQueue: QueueItem[]
    #idleWorkerIds: Set<number>

    constructor() {
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
                username,
                dashboardId,
                displayName,
                onComplete,
            })
        for (const dashboardItem of dashboardItems) {
            dashboardHtmlCollection.createItem(dashboardItem.id)
            this.#dashboardItemsQueue.push({
                dashboardId,
                dashboardItem,
                username,
                password,
            })
        }
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
            worker.on(
                'message',
                (message: ConverterReadyMessage | ConversionResultMessage) => {
                    if (message.type === 'ITEM_CONVERSION_RESULT') {
                        this.#addDashboardItemHtml(
                            message.payload as ConvertedItem
                        )
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
                    } else if (message.type === 'ITEM_CONVERTER_READY') {
                        this.#idleWorkerIds.add(worker.id)
                    } else {
                        throw new Error(
                            `Received a message without a known type from worker with ${worker.id}`
                        )
                    }
                }
            )
        }
    }

    #notifyIdleWorkers() {
        for (const workerId of this.#idleWorkerIds) {
            const worker = cluster.workers?.[workerId]
            const queueItem = this.#takeItemFromQueue()

            if (!worker || !queueItem) {
                throw new Error('Expected to find worker and item but did not')
            }
            worker.send({
                type: 'ITEM_CONVERSION_REQUEST',
                payload: queueItem,
            } as ConversionRequestMessage)
        }
    }
}
