import { IncomingMessage, ServerResponse } from 'http'
import { AddDashboardOptions, ConvertedItem, ConverterResult } from '../types'
import { PushAnalyticsEnvVariables } from '../utils'
import { ClusterManager } from './ClusterManager'
import { DashboardItemsQueue } from './DashboardItemQueue'
import { RequestHandler } from './RequestHandler'
import { ResponseManager } from './ResponseManager'

export class PrimaryProcess {
    #clusterManager: ClusterManager
    #dashboardItemsQueue: DashboardItemsQueue
    requestHandler: RequestHandler
    #responseManager: ResponseManager
    requestListener: (
        request: IncomingMessage,
        response: ServerResponse
    ) => Promise<void>

    constructor(env: PushAnalyticsEnvVariables) {
        this.#clusterManager = new ClusterManager({
            env,
            onWorkerInitialized: this.#handleWorkerReady.bind(this),
            onWorkerExit: this.#handleWorkerExit.bind(this),
            onWorkerConversionSuccess:
                this.#handleWorkerConversionSuccess.bind(this),
            onWorkerConversionFailure:
                this.#handleWorkerConversionFailure.bind(this),
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
    }

    spawnWorkers() {
        this.#clusterManager.spawnWorkers()
    }

    #handleWorkerReady(workerId: number) {
        console.log('handleWorkerReady')
        this.#handleWorkerRelease(workerId)
    }

    #handleWorkerExit() {
        console.log('handleWorkerExit')
        // Remove worker from pool
        // Identify request the crashed worker was busy with
        // Remove all queued dashboard items belonging to that request
        // Ignore all future conversion results for that request
        // Send error response for request
        // Fork a new worker and add the new one to the worker pool
    }

    #handleWorkerConversionSuccess(
        workerId: number,
        convertedItem: ConvertedItem
    ) {
        console.log('handleWorkerConversionSuccess')
        // Add html to response collector
        const { requestId, dashboardItemId, html, css } = convertedItem
        const converterResult: ConverterResult = { html, css }
        this.#responseManager.addDashboardItemHtml(
            requestId,
            dashboardItemId,
            converterResult
        )
        this.#handleWorkerRelease(workerId)
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

        if (this.#clusterManager.hasIdleWorkers()) {
            for (const { id } of this.#clusterManager.getIdleWorkers()) {
                if (this.#dashboardItemsQueue.hasQueuedItems()) {
                    this.#clusterManager.sendQueueItemToWorker(
                        id,
                        this.#dashboardItemsQueue.takeItemFromQueue()
                    )
                }
            }
        }
    }

    #handleRequestHandlerError() {
        console.log('handleRequestHandlerError')
        // send error response
        // remove from response builder
        // remove from item queue
    }

    #handleWorkerRelease(workerId: number) {
        if (this.#dashboardItemsQueue.hasQueuedItems()) {
            // If there items to convert do it
            this.#clusterManager.sendQueueItemToWorker(
                workerId,
                this.#dashboardItemsQueue.takeItemFromQueue()
            )
        } else {
            // Otherwise set status to idle
            this.#clusterManager.setWorkerToIdle(workerId)
        }
    }
}
