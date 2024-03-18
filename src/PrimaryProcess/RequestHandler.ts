import axios from 'axios'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AddDashboardOptions, Dashboard, PushAnalyticsEnvVariables } from '../types'
import {
    getDashboardFieldsParam,
    parseQueryString,
    validateRequest,
} from './RequestHandlerUtils'

type RequestHandlerOptions = {
    env: PushAnalyticsEnvVariables
    onDashboardDetailsReceived: (options: AddDashboardOptions) => void
    onRequestHandlerError: (requestId: number, error: unknown) => void
}

export class RequestHandler {
    #env: PushAnalyticsEnvVariables
    #requestId: number
    #onDashboardDetailsReceived: (options: AddDashboardOptions) => void
    #onRequestHandlerError: (requestId: number, error: unknown) => void

    constructor({
        env,
        onDashboardDetailsReceived,
        onRequestHandlerError,
    }: RequestHandlerOptions) {
        this.#env = env
        this.#onDashboardDetailsReceived = onDashboardDetailsReceived
        this.#onRequestHandlerError = onRequestHandlerError
        this.#requestId = 0
    }

    async handleRequest(request: IncomingMessage, response: ServerResponse) {
        /* Store a "snapshot" of the request ID value to avoid race
         * conditions: if a subsequent request is received before
         * the dashboard items are fetched the value of this.requestId
         * would be off-by-one. */
        const requestId = ++this.#requestId

        try {
            validateRequest(request, this.#env.baseUrl)

            const { dashboardId, username } = parseQueryString(
                request.url,
                this.#env.baseUrl
            )
            const { displayName, dashboardItems } = await this.#getDashboard(dashboardId)
            this.#onDashboardDetailsReceived({
                requestId,
                response,
                username,
                dashboardId,
                displayName,
                dashboardItems,
            })
        } catch (error) {
            this.#onRequestHandlerError(requestId, error)
        }
    }

    async #getDashboard(dashboardId: string) {
        const { apiVersion, baseUrl, adminPassword, adminUsername } = this.#env
        const url = `${baseUrl}/api/${apiVersion}/dashboards/${dashboardId}`
        const options = {
            params: {
                fields: getDashboardFieldsParam(),
            },
            auth: { username: adminUsername, password: adminPassword },
        }
        const result = await axios.get<Dashboard>(url, options)
        return result.data
    }
}
