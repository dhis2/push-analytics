import type { IncomingMessage, ServerResponse } from 'http'
import type { Worker } from 'node:cluster'
import cluster from 'node:cluster'
import type {
    AddDashboardOptions,
    ConvertedItem,
    ConverterResult,
    PushAnalyticsEnvVariables,
    QueueItem,
} from '../types'
import { getThreadLength } from '../utils'
import { DashboardItemsQueue } from './DashboardItemQueue'
import { PrimaryProcessMessageHandler } from './PrimaryProcessMessageHandler'
import { RequestHandler } from './RequestHandler'
import { ResponseManager } from './ResponseManager'

export class PrimaryProcess {
    #env: PushAnalyticsEnvVariables
    #messageHandler: PrimaryProcessMessageHandler
    #dashboardItemsQueue: DashboardItemsQueue
    requestHandler: RequestHandler
    #responseManager: ResponseManager
    requestListener: (
        request: IncomingMessage,
        response: ServerResponse
    ) => Promise<void>

    constructor(env: PushAnalyticsEnvVariables) {
        this.#env = env
        this.#messageHandler = new PrimaryProcessMessageHandler({
            onWorkerItemRequest: this.#handleWorkerItemRequest.bind(this),
            onWorkerConversionSuccess:
                this.#handleWorkerConversionSuccess.bind(this),
            onWorkerConversionFailure:
                this.#handleWorkerConversionFailure.bind(this),
            onWorkerExit: this.#handleWorkerExit.bind(this),
        })
        this.#dashboardItemsQueue = new DashboardItemsQueue()
        this.requestHandler = new RequestHandler({
            env,
            onDashboardDetailsReceived:
                this.#onDashboardDetailsReceived.bind(this),
            onRequestHandlerError: this.#handleRequestHandlerError.bind(this),
        })
        this.#responseManager = new ResponseManager(env)
        this.requestListener = this.requestHandler.handleRequest.bind(
            this.requestHandler
        )
        this.#spawnWorkers()
    }

    #spawnWorkers() {
        const threadLength = getThreadLength(this.#env.maxThreads)
        for (let i = 0; i < threadLength; i++) {
            cluster.fork()
        }
    }

    #handleWorkerExit(worker: Worker) {
        console.log('handleWorkerExit', worker.id)
        // Remove worker from pool
        // Identify request the crashed worker was busy with
        // Remove all queued dashboard items belonging to that request
        // Ignore all future conversion results for that request
        // Send error response for request
        // Fork a new worker and add the new one to the worker pool
    }

    #handleWorkerItemRequest(workerId: number) {
        // Ignore the request if queue is empty
        if (this.#dashboardItemsQueue.hasQueuedItems()) {
            const queueItem: QueueItem =
                this.#dashboardItemsQueue.takeItemFromQueue()
            this.#messageHandler.sendQueueItemToWorker(workerId, queueItem)
        }
    }

    #handleWorkerConversionSuccess(convertedItem: ConvertedItem) {
        console.log('handleWorkerConversionSuccess')
        // Add html to response collector
        const { requestId, dashboardItemId, html, css } = convertedItem
        const converterResult: ConverterResult = { html, css }
        this.#responseManager.addDashboardItemHtml(
            requestId,
            dashboardItemId,
            converterResult
        )
        // Check if the received response completes the dashboard-items in the request
        if (this.#responseManager.isConversionComplete(requestId)) {
            // If it does, then combine HTML and send 200 response
            this.#responseManager.sendResponse(requestId)
        }
    }

    #handleWorkerConversionFailure() {
        console.log('handleWorkerConversionFailure')
        // Identify the request the worker failed conversion was part of
        // Remove all queued dashboard items belonging to that request
        // Ignore all future conversion results for that request
        // Send error response for request
    }

    #onDashboardDetailsReceived(payload: AddDashboardOptions) {
        this.#responseManager.addDashboard(payload)
        this.#dashboardItemsQueue.addItemsToQueue(payload)
        this.#messageHandler.notifyWorkersAboutAddedDashboardItems()
    }

    #handleRequestHandlerError() {
        console.log('handleRequestHandlerError')
        // send error response
        // remove from response builder
        // remove from item queue
    }
}
