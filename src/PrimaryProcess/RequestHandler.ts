import axios from 'axios'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { parseError } from '../Error'
import type { AddDashboardOptions, Dashboard, PushAnalyticsEnvVariables } from '../types'
import {
    getDashboardFieldsParam,
    parseQueryString,
    validateRequest,
} from './RequestHandlerUtils'

type DashboardDetails = Omit<AddDashboardOptions, 'requestId' | 'response'>

type RequestHandlerOptions = {
    env: PushAnalyticsEnvVariables
    onDashboardDetailsReceived: (options: AddDashboardOptions) => void
}

export class RequestHandler {
    #env: PushAnalyticsEnvVariables
    #requestId: number
    #onDashboardDetailsReceived: (options: AddDashboardOptions) => void

    constructor({ env, onDashboardDetailsReceived }: RequestHandlerOptions) {
        this.#env = env
        this.#onDashboardDetailsReceived = onDashboardDetailsReceived
        this.#requestId = 0
    }

    async handleRequest(request: IncomingMessage, response: ServerResponse) {
        /* Store a "snapshot" of the request ID value to avoid race
         * conditions: if a subsequent request is received before
         * the dashboard items are fetched the value of this.requestId
         * would be off-by-one. */
        const requestId = ++this.#requestId
        let dashboardDetails = undefined

        try {
            dashboardDetails = await this.#getDashboardDetails(request)
        } catch (error) {
            /* Note that this is failing before the dashboard (items)
             * are queued, so we can just send an error from here */
            const { httpStatusCode, message } = parseError(error)
            response.writeHead(httpStatusCode)
            response.end(message)
        }

        if (dashboardDetails) {
            this.#onDashboardDetailsReceived({
                requestId,
                response,
                ...dashboardDetails,
            })
        }
    }

    async #getDashboardDetails(
        request: IncomingMessage
    ): Promise<DashboardDetails | undefined> {
        validateRequest(request, this.#env.baseUrl)

        const { dashboardId, username } = parseQueryString(request.url, this.#env.baseUrl)
        const { displayName, dashboardItems } = await this.#getDashboard(dashboardId)
        return {
            dashboardId,
            username,
            displayName,
            dashboardItems,
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
