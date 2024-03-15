import type { ServerResponse } from 'http'
import {
    insertIntoDashboardHeaderTemplate,
    insertIntoEmailTemplate,
} from '../WorkerProcess/htmlTemplates'
import { HttpError } from '../types'
import type {
    AddDashboardOptions,
    ConverterResult,
    PushAnalyticsEnvVariables,
} from '../types'
import { HtmlCollector } from './HtmlCollector'

export class ResponseManager {
    #env: PushAnalyticsEnvVariables
    #responseQueue: Map<
        number,
        {
            requestId: number
            response: ServerResponse
            headerHtml: string
            itemsHtmlCollection: HtmlCollector
        }
    >

    constructor(env: PushAnalyticsEnvVariables) {
        this.#env = env
        this.#responseQueue = new Map()
    }

    addDashboard(
        {
            requestId,
            response,
            dashboardId,
            displayName,
            dashboardItems,
        }: AddDashboardOptions,
        onConversionTimeout: () => void
    ) {
        this.#responseQueue.set(requestId, {
            requestId,
            response,
            headerHtml: insertIntoDashboardHeaderTemplate(
                this.#env.baseUrl,
                dashboardId,
                displayName
            ),
            itemsHtmlCollection: new HtmlCollector(dashboardItems, onConversionTimeout),
        })
    }

    addDashboardItemHtml(
        requestId: number,
        dashboardId: string,
        converterResult: ConverterResult
    ) {
        /* Not finding a responseCollection is a valid scenario.
         * When a conversion fails then the response collection is removed and
         * an error response is sent. But other conversions for other items in this
         * dashboard could already be in-progress when the failure occurs. And when
         * these conversions finish they end up here, where they should simply be
         * ignored. So the conditional chaining below is justified. */
        this.getItemsHtmlCollection(requestId)?.addDashboardItemHtml(
            dashboardId,
            converterResult
        )
    }

    isConversionComplete(requestId: number) {
        return this.getItemsHtmlCollection(requestId)?.isComplete() ?? false
    }

    sendSuccessResponse(requestId: number) {
        const { response, headerHtml, itemsHtmlCollection } =
            this.#getResponseQueueItem(requestId)
        const { html, css } = itemsHtmlCollection.combineItemsHtml()
        itemsHtmlCollection.clearConversionTimeout()
        const fullHtml = insertIntoEmailTemplate(headerHtml + html, css)

        this.#responseQueue.delete(requestId)

        response.writeHead(200)
        response.end(fullHtml)
    }

    sendErrorResponse(requestId: number, error: unknown) {
        const { response } = this.#getResponseQueueItem(requestId)
        const statusCode = error instanceof HttpError ? error.statusCode : 500
        const message = error instanceof Error ? error.message : 'Internal error'

        this.#responseQueue.delete(requestId)

        response.writeHead(statusCode)
        response.end(message)
    }

    getPendingRequestIds() {
        return Array.from(this.#responseQueue.values()).map(({ requestId }) => requestId)
    }

    getItemsHtmlCollection(requestId: number) {
        return this.#responseQueue.get(requestId)?.itemsHtmlCollection
    }

    #getResponseQueueItem(requestId: number) {
        const responseQueueItem = this.#responseQueue.get(requestId)

        if (!responseQueueItem) {
            throw new Error(
                `Cannot find response queue item for request ID "${requestId}"`
            )
        }

        return responseQueueItem
    }
}
