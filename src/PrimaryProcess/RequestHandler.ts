import axios from 'axios'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AddDashboardOptions, Dashboard, PushAnalyticsEnvVariables } from '../types'
import {
    parseQueryString,
    validateRequest,
    getDashboardFieldsParam,
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
            // TODO: remove this part, this is sth that happens when testing in the browser
            if (request.url === '/favicon.ico') {
                response.writeHead(404)
                response.end()
                return
            }
            validateRequest(request)

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
            console.log(error)
            // console.log(error)
            // if (error instanceof HttpResponseStatusError) {
            //     response.writeHead(error.status)
            // } else {
            //     response.writeHead(500)
            // }
            // if (error instanceof Error) {
            //     response.end(error.message)
            // } else {
            //     response.end('An unknown error occurred')
            // }
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
