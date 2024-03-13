import { ConversionError, ConvertedItem, QueueItem } from '../types'
import { PushAnalyticsEnvVariables } from '../utils'
import { DashboardItemConverter } from './DashboardItemConverter'
import { WorkerProcessMessageHandler } from './WorkerProcessMessageHandler'

export class WorkerProcess {
    #messageHandler: WorkerProcessMessageHandler
    #converter: DashboardItemConverter

    private constructor(converter: DashboardItemConverter) {
        this.#converter = converter
        this.#messageHandler = new WorkerProcessMessageHandler({
            onItemsAddedToQueue: this.#handleItemsAddedToQueue.bind(this),
            onItemTakenFromQueue: this.#handleItemTakenFromQueue.bind(this),
        })
        // See if there is work to do
        this.#messageHandler.requestDashboardItemFromQueue()
    }

    static async create(env: PushAnalyticsEnvVariables, debug: boolean) {
        const converter = new DashboardItemConverter(env, debug)
        await converter.init()
        return new WorkerProcess(converter)
    }

    #handleItemsAddedToQueue() {
        // Ignore this event if still converting
        if (!this.#converter.isConverting()) {
            this.#messageHandler.requestDashboardItemFromQueue()
        }
    }

    async #handleItemTakenFromQueue(queueItem: QueueItem) {
        if (this.#converter.isConverting()) {
            throw new Error(
                'Received a queueItem while converting, this should not happen'
            )
        }

        try {
            const convertedItem: ConvertedItem = await this.#converter.convert(
                queueItem
            )
            this.#messageHandler.sendConvertedItemToPrimaryProcess(
                convertedItem
            )
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Conversion error'
            const conversionError: ConversionError = {
                requestId: queueItem.requestId,
                dashboardId: queueItem.dashboardId,
                username: queueItem.username,
                dashboardItemId: queueItem.dashboardItem.id,
                errorMessage,
            }
            this.#messageHandler.sendItemConversionErrorToPrimaryProcess(
                conversionError
            )
        } finally {
            // See if there is more work to do
            this.#messageHandler.requestDashboardItemFromQueue()
        }
    }
}
