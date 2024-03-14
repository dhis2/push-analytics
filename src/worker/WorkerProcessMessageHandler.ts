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

type OnItemsAddedToQueueFn = () => void
type OnItemTakenFromQueueFn = (queueItem: QueueItem) => void
type WorkerProcessMessageHandlerOptions = {
    onItemsAddedToQueue: OnItemsAddedToQueueFn
    onItemTakenFromQueue: OnItemTakenFromQueueFn
}

export class WorkerProcessMessageHandler {
    #onItemsAddedToQueue
    #onItemTakenFromQueue

    constructor({
        onItemsAddedToQueue,
        onItemTakenFromQueue,
    }: WorkerProcessMessageHandlerOptions) {
        this.#onItemsAddedToQueue = onItemsAddedToQueue
        this.#onItemTakenFromQueue = onItemTakenFromQueue
        process.on('message', this.#handlePrimaryProcessMessage.bind(this))
    }

    requestDashboardItemFromQueue() {
        const message: ItemRequestedFromQueueMessage = {
            type: 'ITEM_REQUESTED_FROM_QUEUE',
        }
        this.#notifyPrimaryProcess(message)
    }

    sendConvertedItemToPrimaryProcess(convertedItem: ConvertedItem) {
        const message: ItemConvertedMessage = {
            type: 'ITEM_CONVERTED',
            payload: convertedItem,
        }
        this.#notifyPrimaryProcess(message)
    }

    sendItemConversionErrorToPrimaryProcess(conversionError: ConversionError) {
        const message: ItemConversionErrorMessage = {
            type: 'ITEM_CONVERSION_ERROR',
            payload: conversionError,
        }
        this.#notifyPrimaryProcess(message)
    }

    #notifyPrimaryProcess(
        message:
            | ItemRequestedFromQueueMessage
            | ItemConvertedMessage
            | ItemConversionErrorMessage
    ) {
        if (!process?.send) {
            throw new Error('Cannont send message from worker to main thread')
        }
        process.send(message)
    }

    #handlePrimaryProcessMessage(
        message: ItemsAddedToQueueMessage | ItemTakenFromQueueMessage
    ) {
        switch (message.type) {
            case 'ITEMS_ADDED_TO_QUEUE':
                return this.#onItemsAddedToQueue()
            case 'ITEM_TAKEN_FROM_QUEUE':
                return this.#onItemTakenFromQueue(message.payload as QueueItem)
            default:
                throw new Error('Received unknown message from primary process')
        }
    }
}
