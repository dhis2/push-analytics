import type { IncomingMessage, ServerResponse } from 'http'
import type { Worker } from 'node:cluster'
import cluster from 'node:cluster'
import { availableParallelism } from 'node:os'
import type {
    AddDashboardOptions,
    ConversionErrorPayload,
    ConvertedItemPayload,
    ConverterResult,
    PushAnalyticsEnvVariables,
    QueueItem,
} from '../types'
import { DashboardItemsQueue } from './DashboardItemQueue'
import { PrimaryProcessMessageHandler } from './PrimaryProcessMessageHandler'
import { RequestHandler } from './RequestHandler'
import { ResponseManager } from './ResponseManager'
import { PushAnalyticsError } from '../Error'

class PrimaryProcessError extends PushAnalyticsError {
    constructor(
        message: string,
        errorCode: string = 'E1101',
        httpResponseStatusCode: number = 500
    ) {
        super(message, errorCode, httpResponseStatusCode)
    }
}

export class PrimaryProcess {
    #workerCount: number
    #messageHandler: PrimaryProcessMessageHandler
    #dashboardItemsQueue: DashboardItemsQueue
    requestHandler: RequestHandler
    #responseManager: ResponseManager
    requestListener: (request: IncomingMessage, response: ServerResponse) => Promise<void>

    constructor(env: PushAnalyticsEnvVariables) {
        this.#workerCount = this.#computeWorkerCount(env.maxThreads)
        this.#messageHandler = new PrimaryProcessMessageHandler({
            onWorkerItemRequest: this.#handleWorkerItemRequest.bind(this),
            onWorkerConversionSuccess: this.#handleWorkerConversionSuccess.bind(this),
            onWorkerConversionFailure: this.#handleWorkerConversionFailure.bind(this),
            onWorkerExit: this.#handleWorkerExit.bind(this),
        })
        this.#dashboardItemsQueue = new DashboardItemsQueue()
        this.requestHandler = new RequestHandler({
            env,
            onDashboardDetailsReceived: this.#onDashboardDetailsReceived.bind(this),
            onRequestHandlerError: this.#handleRequestHandlerError.bind(this),
        })
        this.#responseManager = new ResponseManager(env)
        this.requestListener = this.requestHandler.handleRequest.bind(this.requestHandler)
        this.#initializeWorkers()
    }

    #handleWorkerExit(worker: Worker) {
        /* Technically it would be possible to handle this
         * in a much more sophisticated way. We could find out if the worker
         * was busy doing a conversion and then we could either retry that
         * conversion, or we could send an error response to the request
         * the dashboard item was part of. But this would involve implementing
         * additional state by which we can map a worker.id to a
         * request.id. I don't think it would be overly complex, but in
         * practice we've only seen workers die when the service was idle
         * for a long time. So we just go with this simple but quite drastic
         * approach of sending error responses to all pending requests and
         * and clearing the dashboard item queue. */
        this.#dashboardItemsQueue.clearQueue()
        for (const requestId of this.#responseManager.getPendingRequestIds()) {
            this.#responseManager.sendErrorResponse(
                requestId,
                new PrimaryProcessError(
                    `Conversion worker with ID "${worker.id}" crashed, need to restart`,
                    'E1102'
                )
            )
        }
        // Start another worker to replace the dead one
        cluster.fork()
    }

    #handleWorkerItemRequest(workerId: number) {
        // Ignore the request if queue is empty
        if (this.#dashboardItemsQueue.hasQueuedItems()) {
            const queueItem: QueueItem = this.#dashboardItemsQueue.takeItemFromQueue()
            this.#messageHandler.sendQueueItemToWorker(workerId, queueItem)
        }
    }

    #handleWorkerConversionSuccess(convertedItem: ConvertedItemPayload) {
        const { requestId, dashboardItemId, html, css } = convertedItem
        const converterResult: ConverterResult = { html, css }
        this.#responseManager.addDashboardItemHtml(
            requestId,
            dashboardItemId,
            converterResult
        )
        if (this.#responseManager.isConversionComplete(requestId)) {
            this.#responseManager.sendSuccessResponse(requestId)
        }
    }

    #handleWorkerConversionFailure(conversionErrorPayload: ConversionErrorPayload) {
        const { requestId, errorMessage, errorCode, httpResponseStatusCode, errorName } =
            conversionErrorPayload
        // Turn the message into a proper error again
        const error = new PushAnalyticsError(
            errorMessage,
            errorCode,
            httpResponseStatusCode,
            errorName
        )
        this.#dashboardItemsQueue.removeItemsByRequestId(requestId)
        this.#responseManager.sendErrorResponse(requestId, error)
    }

    #onDashboardDetailsReceived(details: AddDashboardOptions) {
        const onConversionTimeout = () => {
            this.#handleConversionTimeout(details.requestId)
        }
        this.#responseManager.addDashboard(details, onConversionTimeout)
        this.#dashboardItemsQueue.addItemsToQueue(details)
        this.#messageHandler.notifyWorkersAboutAddedDashboardItems()
    }

    #handleRequestHandlerError(requestId: number, error: unknown) {
        this.#dashboardItemsQueue.removeItemsByRequestId(requestId)
        this.#responseManager.sendErrorResponse(requestId, error)
    }

    #handleConversionTimeout(requestId: number) {
        this.#dashboardItemsQueue.removeItemsByRequestId(requestId)
        this.#responseManager.sendErrorResponse(
            requestId,
            new PrimaryProcessError(
                'Conversion workers took too long to convert the dashboard',
                'E1102',
                504
            )
        )
    }

    #computeWorkerCount(maxThreads: string = ''): number {
        const availableThreads = availableParallelism()

        if (maxThreads) {
            if (maxThreads.toLowerCase() === 'max') {
                return availableThreads
            }
            return Math.min(parseInt(maxThreads), availableThreads)
        }

        return Math.ceil(availableThreads / 2)
    }

    #initializeWorkers() {
        for (let i = 0; i < this.#workerCount; i++) {
            cluster.fork()
        }
    }
}
