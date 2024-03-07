import cluster, { Worker } from 'node:cluster'
import { PushAnalyticsEnvVariables, getThreadLength } from '../utils'
import {
    ConversionRequestMessage,
    ConversionResultMessage,
    ConvertedItem,
    QueueItem,
    WorkerInitializedMessage,
} from '../types'

type ConversionWorker = {
    id: number
    idle: boolean
    worker: Worker
}

type OnWorkerInitializedFn = (workerId: number) => void
type OnWorkerExitFn = (worker: Worker) => void
type OnWorkerConversionSuccessFn = (
    workerId: number,
    convertedItem: ConvertedItem
) => void
type OnWorkerConversionFailureFn = () => void

type ClusterManagerOptions = {
    env: PushAnalyticsEnvVariables
    onWorkerInitialized: OnWorkerInitializedFn
    onWorkerExit: OnWorkerExitFn
    onWorkerConversionSuccess: OnWorkerConversionSuccessFn
    onWorkerConversionFailure: OnWorkerConversionFailureFn
}

export class ClusterManager {
    #onWorkerInitialized: OnWorkerInitializedFn
    #onWorkerExit: OnWorkerExitFn
    #onWorkerConversionSuccess: OnWorkerConversionSuccessFn
    #onWorkerConversionFailure: OnWorkerConversionFailureFn
    #threadLength: number
    #conversionWorkers: Map<number, ConversionWorker>

    constructor({
        env,
        onWorkerInitialized,
        onWorkerExit,
        onWorkerConversionSuccess,
        onWorkerConversionFailure,
    }: ClusterManagerOptions) {
        this.#onWorkerInitialized = onWorkerInitialized
        this.#onWorkerExit = onWorkerExit
        this.#onWorkerConversionSuccess = onWorkerConversionSuccess
        this.#onWorkerConversionFailure = onWorkerConversionFailure
        this.#threadLength = getThreadLength(env.maxThreads)
        this.#conversionWorkers = new Map()
        cluster.on('message', this.#handleWorkerMessage.bind(this))
        cluster.on('exit', this.#handleWorkerExit.bind(this))
    }

    spawnWorkers() {
        for (let i = 0; i < this.#threadLength; i++) {
            this.#spawnWorker()
        }
    }

    hasIdleWorkers() {
        for (const [, { idle }] of this.#conversionWorkers) {
            if (idle) {
                return true
            }
        }
        return false
    }

    getIdleWorkers(): Worker[] {
        const idleWorkers = []
        for (const [, conversionWorker] of this.#conversionWorkers) {
            if (conversionWorker.idle) {
                idleWorkers.push(conversionWorker.worker)
            }
        }
        return idleWorkers
    }

    setWorkerToIdle(workerId: number) {
        const conversionWorker = this.#getConversionWorkerById(workerId)
        conversionWorker.idle = true
    }

    sendQueueItemToWorker(workerId: number, queueItem: QueueItem) {
        const conversionWorker = this.#getConversionWorkerById(workerId)
        conversionWorker.worker.send({
            type: 'ITEM_CONVERSION_REQUEST',
            payload: queueItem,
        } as ConversionRequestMessage)
    }

    #spawnWorker() {
        const worker = cluster.fork()
        this.#conversionWorkers.set(worker.id, {
            id: worker.id,
            idle: false,
            worker,
        })
    }

    #getConversionWorkerById(id: number): ConversionWorker {
        const conversionWorker = this.#conversionWorkers.get(id)

        if (!conversionWorker) {
            throw new Error(`No worker with id "${id}" found.`)
        }

        return conversionWorker
    }

    #handleWorkerMessage(
        worker: Worker,
        message: WorkerInitializedMessage | ConversionResultMessage
    ) {
        if (message.type === 'WORKER_INITIALIZED' && !message.payload) {
            this.#onWorkerInitialized(worker.id)
        } else if (
            message.type === 'ITEM_CONVERSION_RESULT' &&
            message.payload
        ) {
            this.#onWorkerConversionSuccess(
                worker.id,
                message.payload as ConvertedItem
            )
        } else {
            throw new Error('Received unknown message from worker')
        }
    }

    #handleWorkerExit(exitedWorker: Worker) {
        console.log(`Worder died with PID "${exitedWorker.id}"`)
    }
}
