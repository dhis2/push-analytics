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

    constructor(baseUrl: string, maxThreads: string) {
        this.#baseUrl = baseUrl
        this.#dashboardsHtmlStore = new DashboardsHtmlStore()
        this.#dashboardItemsQueue = []
        this.#idleWorkerIds = new Set()
        this.#createWorkers(maxThreads)
        this.#addOnExitListener()
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

    #createWorkers(maxThreads: string) {
        const threadLength = getThreadLength(maxThreads)
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
                    this.#idleWorkerIds.delete(worker.id)
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

    #addOnExitListener() {
        cluster.on('exit', (worker, code, signal) => {
            console.log(
                `Worker ${worker.process.pid} died (${
                    signal ?? code
                }). Going to terminate all workers and the main process.`
            )
            for (const id in cluster.workers) {
                const worker = cluster.workers[id]

                const pid = worker?.process.pid
                worker?.kill()

                if (pid) {
                    process.kill(pid)
                }
            }
            process.exit(1)
        })
    }
}
