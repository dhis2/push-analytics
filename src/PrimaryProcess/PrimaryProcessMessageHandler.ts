import type { Worker } from 'node:cluster'
import cluster from 'node:cluster'
import type {
    ConversionError,
    ConvertedItem,
    ItemConversionErrorMessage,
    ItemConvertedMessage,
    ItemRequestedFromQueueMessage,
    ItemTakenFromQueueMessage,
    ItemsAddedToQueueMessage,
    QueueItem,
} from '../types'

type OnWorkerItemRequestFn = (workerId: number) => void
type OnWorkerConversionSuccessFn = (convertedItem: ConvertedItem) => void
type OnWorkerConversionFailureFn = (conversionError: ConversionError) => void
type OnWorkerExitFn = (worker: Worker) => void

type PrimaryProcessMessageHandlerOptions = {
    onWorkerItemRequest: OnWorkerItemRequestFn
    onWorkerConversionSuccess: OnWorkerConversionSuccessFn
    onWorkerConversionFailure: OnWorkerConversionFailureFn
    onWorkerExit: OnWorkerExitFn
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
            throw new Error('Could not get cluster workers')
        }
    }

    notifyWorkersAboutAddedDashboardItems() {
        for (const worker of Object.values(this.clusterWorkers)) {
            if (!worker) {
                throw new Error('Worker not found')
            }

            worker.send({
                type: 'ITEMS_ADDED_TO_QUEUE',
            } as ItemsAddedToQueueMessage)
        }
    }

    sendQueueItemToWorker(workerId: number, queueItem: QueueItem) {
        const worker = this.clusterWorkers[workerId]

        if (!worker) {
            throw new Error(`Could not find worker with ID "${workerId}"`)
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
                return this.#onWorkerConversionSuccess(message.payload as ConvertedItem)
            case 'ITEM_CONVERSION_ERROR':
                return this.#onWorkerConversionFailure(message.payload as ConversionError)
            default:
                throw new Error('Received unknown message from worker')
        }
    }
}
