import type { ServerResponse } from 'http'
import { PushAnalyticsError, parseError } from '../Error'
import {
    insertIntoDashboardHeaderTemplate,
    insertIntoEmailTemplate,
} from '../WorkerProcess/htmlTemplates'
import type {
    AddDashboardOptions,
    ConverterResult,
    PushAnalyticsEnvVariables,
} from '../types'
import { HtmlCollector } from './HtmlCollector'
import { debugLog } from '../debugLog'

class ResponseManagerError extends PushAnalyticsError {
    constructor(
        message: string,
        errorCode: string = 'E1601',
        httpResponseStatusCode: number = 500
    ) {
        super(message, errorCode, httpResponseStatusCode)
    }
}

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
        const queueItem = this.#responseQueue.get(requestId)

        if (!queueItem) {
            throw new ResponseManagerError(
                `Cannot find response queue item for request ID "${requestId}"`
            )
        }

        const { response, headerHtml, itemsHtmlCollection } = queueItem
        const { html, css } = itemsHtmlCollection.combineItemsHtml()
        const fullHtml = insertIntoEmailTemplate(headerHtml + html, css)

        itemsHtmlCollection.clearConversionTimeout()
        this.#responseQueue.delete(requestId)

        debugLog(
            `Dashboard converted successfully for request ID "${requestId}" - sending converted dashboard HTML`
        )

        response.writeHead(200)
        response.end(fullHtml)
    }

    sendErrorResponse(requestId: number, error: unknown) {
        const queueItem = this.#responseQueue.get(requestId)

        /* Not finding a queue item is a valid scenario which occurs
         * when a single dashboard has multiple failing conversions
         * being processed simultanuiously. */
        if (queueItem) {
            const { httpStatusCode, message } = parseError(error)

            debugLog(
                `Dashboard failed to convert for request ID "${requestId}" - sending error message "${message}"`
            )

            this.#responseQueue.delete(requestId)
            queueItem.response.writeHead(httpStatusCode)
            queueItem.response.end(message)
        }
    }

    getPendingRequestIds() {
        return Array.from(this.#responseQueue.values()).map(({ requestId }) => requestId)
    }

    getItemsHtmlCollection(requestId: number) {
        return this.#responseQueue.get(requestId)?.itemsHtmlCollection
    }
}
