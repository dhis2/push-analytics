import type { Worker } from 'node:cluster'
import cluster from 'node:cluster'
import { PushAnalyticsError } from '../Error'
import type {
    ConversionErrorPayload,
    ConvertedItemPayload,
    ItemConversionErrorMessage,
    ItemConvertedMessage,
    ItemRequestedFromQueueMessage,
    ItemTakenFromQueueMessage,
    ItemsAddedToQueueMessage,
    QueueItem,
} from '../types'
import { debugLog } from '../debugLog'

type OnWorkerItemRequestFn = (workerId: number) => void
type OnWorkerConversionSuccessFn = (convertedItem: ConvertedItemPayload) => void
type OnWorkerConversionFailureFn = (conversionError: ConversionErrorPayload) => void
type OnWorkerExitFn = (worker: Worker, code: number, signal: string) => void

type PrimaryProcessMessageHandlerOptions = {
    onWorkerItemRequest: OnWorkerItemRequestFn
    onWorkerConversionSuccess: OnWorkerConversionSuccessFn
    onWorkerConversionFailure: OnWorkerConversionFailureFn
    onWorkerExit: OnWorkerExitFn
}

class PrimaryProcessMessageHandlerError extends PushAnalyticsError {
    constructor(
        message: string,
        errorCode: string = 'E1401',
        httpResponseStatusCode: number = 500
    ) {
        super(message, errorCode, httpResponseStatusCode)
    }
}

export class PrimaryProcessMessageHandler {
    #onWorkerItemRequest: OnWorkerItemRequestFn
    #onWorkerConversionSuccess: OnWorkerConversionSuccessFn
    #onWorkerConversionFailure: OnWorkerConversionFailureFn
    #onWorkerExit: OnWorkerExitFn

    constructor({
        onWorkerItemRequest,
        onWorkerConversionSuccess,
        onWorkerConversionFailure,
        onWorkerExit,
    }: PrimaryProcessMessageHandlerOptions) {
        this.#onWorkerItemRequest = onWorkerItemRequest
        this.#onWorkerConversionSuccess = onWorkerConversionSuccess
        this.#onWorkerConversionFailure = onWorkerConversionFailure
        this.#onWorkerExit = onWorkerExit
        cluster.on('message', this.#handleWorkerMessage.bind(this))
        cluster.on('exit', this.#onWorkerExit.bind(this))
    }

    get clusterWorkers() {
        if (cluster?.workers) {
            return cluster.workers
        } else {
            throw new PrimaryProcessMessageHandlerError('Could not get cluster workers')
        }
    }

    notifyWorkersAboutAddedDashboardItems() {
        for (const worker of Object.values(this.clusterWorkers)) {
            if (!worker) {
                throw new PrimaryProcessMessageHandlerError('Worker not found')
            }

            worker.send({
                type: 'ITEMS_ADDED_TO_QUEUE',
            } as ItemsAddedToQueueMessage)
        }
    }

    sendQueueItemToWorker(workerId: number, queueItem?: QueueItem) {
        const worker = this.clusterWorkers[workerId]

        if (queueItem) {
            debugLog(
                `Received item request and queue is populated, sending queueItem to worker with PID "${worker?.process.pid}": `,
                queueItem
            )
        } else {
            debugLog(
                `Received item request but queue is empty, sending empty message to worker with PID "${worker?.process.pid}"`
            )
        }

        if (!worker) {
            throw new PrimaryProcessMessageHandlerError(
                `Could not find worker with ID "${workerId}"`
            )
        }

        worker.send({
            type: 'ITEM_TAKEN_FROM_QUEUE',
            payload: queueItem,
        } as ItemTakenFromQueueMessage)
    }

    #handleWorkerMessage(
        worker: Worker,
        message:
            | ItemRequestedFromQueueMessage
            | ItemConvertedMessage
            | ItemConversionErrorMessage
    ) {
        switch (message.type) {
            case 'ITEM_REQUESTED_FROM_QUEUE':
                return this.#onWorkerItemRequest(worker.id)
            case 'ITEM_CONVERTED':
                return this.#onWorkerConversionSuccess(
                    message.payload as ConvertedItemPayload
                )
            case 'ITEM_CONVERSION_ERROR':
                return this.#onWorkerConversionFailure(
                    message.payload as ConversionErrorPayload
                )
            default:
                throw new PrimaryProcessMessageHandlerError(
                    'Received unknown message from worker'
                )
        }
    }
}
