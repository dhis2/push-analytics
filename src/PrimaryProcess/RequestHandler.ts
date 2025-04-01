import axios from 'axios'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { parseError } from '../Error'
import { debugLog } from '../debugLog'
import type { AddDashboardOptions, Dashboard, PushAnalyticsEnvVariables } from '../types'
import {
    getDashboardFieldsParam,
    parseQueryString,
    validateRequest,
} from './RequestHandlerUtils'
import { RequestHandlerError } from './RequestHandlerUtils/RequestHandlerError'

type DashboardDetails = Omit<AddDashboardOptions, 'requestId' | 'response'> & {
    locale: string
}

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
        console.log('REQUEST RECEIVED BY PUSH ANALYTICS, HERE IS MY ENV')
        console.log(JSON.stringify(this.#env, null, 4))

        try {
            dashboardDetails = await this.#getDashboardDetails(request)
            const { dashboardId, username, locale } = dashboardDetails
            debugLog(
                `Received conversion request for dasboardId "${dashboardId}", username "${username}", and locale "${locale}"`
            )
        } catch (error) {
            /* Note that this is failing before the dashboard (items)
             * are queued, so we can just send an error from here */
            const { httpStatusCode, message } = parseError(error)
            response.writeHead(httpStatusCode)
            response.end(message)
        }

        if (dashboardDetails && dashboardDetails.username !== 'system') {
            this.#onDashboardDetailsReceived({
                requestId,
                response,
                ...dashboardDetails,
            })
        }
    }

    async #getDashboardDetails(request: IncomingMessage): Promise<DashboardDetails> {
        validateRequest(request, this.#env.baseUrl)

        const { dashboardId, username, locale } = parseQueryString(
            request.url,
            this.#env.baseUrl
        )
        const { displayName, dashboardItems } = await this.#getDashboard(
            dashboardId,
            locale
        )
        return {
            dashboardId,
            username,
            locale,
            displayName,
            dashboardItems,
        }
    }

    async #getDashboard(dashboardId: string, locale: string) {
        try {
            const { apiVersion, baseUrl, adminPassword, adminUsername } = this.#env
            const url = `${baseUrl}/api/${apiVersion}/dashboards/${dashboardId}`
            const options = {
                params: {
                    fields: getDashboardFieldsParam(),
                    locale,
                },
                auth: { username: adminUsername, password: adminPassword },
            }
            const result = await axios.get<Dashboard>(url, options)
            return result.data
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'unknow error'
            const message = `Could not fetch dashboard details for ID "${dashboardId}", error: ${errorMessage}`
            debugLog(message)
            throw new RequestHandlerError(message)
        }
    }
}
