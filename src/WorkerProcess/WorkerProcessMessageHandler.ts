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

type OnItemsAddedToQueueFn = () => void
type OnItemTakenFromQueueFn = (queueItem: QueueItem) => void
type WorkerProcessMessageHandlerOptions = {
    onItemsAddedToQueue: OnItemsAddedToQueueFn
    onResponseToItemRequest: OnItemTakenFromQueueFn
}

class WorkerProcessMessageHandlerError extends PushAnalyticsError {
    constructor(
        message: string,
        errorCode: string = 'E2701',
        httpResponseStatusCode: number = 500
    ) {
        super(message, errorCode, httpResponseStatusCode)
    }
}

export class WorkerProcessMessageHandler {
    #onItemsAddedToQueue
    #onResponseToItemRequest

    constructor({
        onItemsAddedToQueue,
        onResponseToItemRequest,
    }: WorkerProcessMessageHandlerOptions) {
        this.#onItemsAddedToQueue = onItemsAddedToQueue
        this.#onResponseToItemRequest = onResponseToItemRequest
        process.on('message', this.#handlePrimaryProcessMessage.bind(this))
    }

    requestDashboardItemFromQueue() {
        const message: ItemRequestedFromQueueMessage = {
            type: 'ITEM_REQUESTED_FROM_QUEUE',
        }
        this.#notifyPrimaryProcess(message)
    }

    sendConvertedItemToPrimaryProcess(convertedItem: ConvertedItemPayload) {
        const message: ItemConvertedMessage = {
            type: 'ITEM_CONVERTED',
            payload: convertedItem,
        }
        this.#notifyPrimaryProcess(message)
    }

    sendItemConversionErrorToPrimaryProcess(conversionError: ConversionErrorPayload) {
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
            throw new WorkerProcessMessageHandlerError(
                'Cannont send message from worker to main thread'
            )
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
                return this.#onResponseToItemRequest(message.payload as QueueItem)
            default:
                throw new WorkerProcessMessageHandlerError(
                    'Received unknown message from primary process'
                )
        }
    }
}
