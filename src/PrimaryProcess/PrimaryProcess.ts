import type { IncomingMessage, ServerResponse } from 'http'
import type { Worker } from 'node:cluster'
import cluster from 'node:cluster'
import { availableParallelism } from 'node:os'
import { PushAnalyticsError } from '../Error'
import { debugLog } from '../debugLog'
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
    #workerExitLog: number[]
    #messageHandler: PrimaryProcessMessageHandler
    #dashboardItemsQueue: DashboardItemsQueue
    requestHandler: RequestHandler
    #responseManager: ResponseManager
    requestListener: (request: IncomingMessage, response: ServerResponse) => Promise<void>

    constructor(env: PushAnalyticsEnvVariables) {
        this.#workerCount = this.#computeWorkerCount(env.maxThreads)
        this.#workerExitLog = []
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
        })
        this.#responseManager = new ResponseManager(env)
        this.requestListener = this.requestHandler.handleRequest.bind(this.requestHandler)
        this.#initializeWorkers()
    }

    #handleWorkerExit(worker: Worker, code: number, signal: string) {
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
        debugLog(
            `Worker with PID "${worker.process.pid}" died with code "${code}" and signal "${signal}"). Clearing the queue`
        )
        this.#workerExitLog.push(Date.now())
        const hasFrequentExits = this.#hasFrequentExits()
        this.#dashboardItemsQueue.clearQueue()

        for (const requestId of this.#responseManager.getPendingRequestIds()) {
            const message = hasFrequentExits
                ? 'Too many workers have crashed, push-analytics-service will terminate'
                : `Conversion worker with ID "${worker.id}" crashed, need to restart`
            this.#responseManager.sendErrorResponse(
                requestId,
                new PrimaryProcessError(message, 'E1102')
            )
        }

        // Prevent infinite worker-restart loops
        if (hasFrequentExits) {
            for (const id in cluster.workers) {
                cluster.workers[id]?.kill()
            }
            process.exit(0)
        } else {
            // Start another worker to replace the dead one
            const newWorker = cluster.fork()
            debugLog(
                `New worker with PID "${newWorker.process.pid}" will replace old worker with PID ${worker.process.pid}`
            )
        }
    }

    #handleWorkerItemRequest(workerId: number) {
        // Awlways reply to the worker, it won't request more work until a reply comes in
        const queueItem: QueueItem | undefined =
            this.#dashboardItemsQueue.hasQueuedItems()
                ? this.#dashboardItemsQueue.takeItemFromQueue()
                : undefined

        this.#messageHandler.sendQueueItemToWorker(workerId, queueItem)
    }

    #handleWorkerConversionSuccess(convertedItem: ConvertedItemPayload) {
        const { requestId, dashboardItemId, html, css } = convertedItem
        const converterResult: ConverterResult = { html, css }
        this.#responseManager.addDashboardItemHtml(
            requestId,
            dashboardItemId,
            converterResult
        )
        debugLog('Queue item converted', convertedItem)
        if (this.#responseManager.isConversionComplete(requestId)) {
            debugLog('Dashboard conversion complete', convertedItem)
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
        debugLog('Queue item conversion failed', conversionErrorPayload)
        this.#dashboardItemsQueue.removeItemsByRequestId(requestId)
        this.#responseManager.sendErrorResponse(requestId, error)
    }

    #onDashboardDetailsReceived(details: AddDashboardOptions) {
        const onConversionTimeout = () => {
            this.#handleConversionTimeout(details.requestId)
        }
        debugLog('Received dashboard details', details)
        this.#responseManager.addDashboard(details, onConversionTimeout)
        this.#dashboardItemsQueue.addItemsToQueue(details)
        this.#messageHandler.notifyWorkersAboutAddedDashboardItems()
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

    #hasFrequentExits() {
        const lasTimestamp = this.#workerExitLog[this.#workerExitLog.length - 1]
        const tenMinutesAgoTimestamp = lasTimestamp - 10 * 60 * 1000
        return (
            this.#workerExitLog.filter(
                (exitTimestamp) => exitTimestamp >= tenMinutesAgoTimestamp
            ).length > 10
        )
    }
}
