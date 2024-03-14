import type { ServerResponse } from 'http'
import {
    insertIntoDashboardHeaderTemplate,
    insertIntoEmailTemplate,
} from '../templates'
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

    addDashboard({
        requestId,
        response,
        dashboardId,
        displayName,
        dashboardItems,
    }: AddDashboardOptions) {
        this.#responseQueue.set(requestId, {
            requestId,
            response,
            headerHtml: insertIntoDashboardHeaderTemplate(
                this.#env.baseUrl,
                dashboardId,
                displayName
            ),
            itemsHtmlCollection: new HtmlCollector(dashboardItems),
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

    sendResponse(requestId: number) {
        const responseQueueItem = this.#responseQueue.get(requestId)

        if (!responseQueueItem) {
            throw new Error(
                `Cannot find response queue item for request ID "${requestId}"`
            )
        }

        const { response, headerHtml, itemsHtmlCollection } = responseQueueItem
        const { html, css } = itemsHtmlCollection.combineItemsHtml()
        const fullHtml = insertIntoEmailTemplate(headerHtml + html, css)

        this.#responseQueue.delete(requestId)

        response.writeHead(200)
        response.end(fullHtml)
    }

    getItemsHtmlCollection(requestId: number) {
        return this.#responseQueue.get(requestId)?.itemsHtmlCollection
    }
}
