import axios from 'axios'
import { IncomingMessage, ServerResponse } from 'node:http'
import {
    PushAnalyticsEnvVariables,
    parseQueryString,
    validateRequest,
} from '../utils'
// import { HttpResponseStatusError } from '../httpGetClient'
import { AddDashboardOptions, Dashboard, Field } from '../types'

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
            validateRequest(request)
            const { dashboardId, username } = parseQueryString(
                request.url,
                this.#env.baseUrl
            )
            const { displayName, dashboardItems } = await this.#getDashboard(
                dashboardId
            )
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
                fields: getDashboardFieldsParamValue(),
            },
            auth: { username: adminUsername, password: adminPassword },
        }
        const result = await axios.get<Dashboard>(url, options)
        return result.data
    }
}

function getDashboardFieldsParamValue() {
    return [
        'displayName',
        'itemCount',
        {
            name: 'dashboardItems',
            fields: [
                'id',
                'type',
                'text',
                'x',
                'y',
                { name: 'eventChart', fields: ['id', 'name', 'type'] },
                { name: 'eventReport', fields: ['id', 'name', 'type'] },
                { name: 'eventVisualization', fields: ['id', 'name', 'type'] },
                { name: 'map', fields: ['id', 'name'] },
                { name: 'reports', fields: ['id', 'name', 'type'] },
                { name: 'resources', fields: ['id', 'name'] },
                { name: 'visualization', fields: ['id', 'name', 'type'] },
            ],
        },
    ]
        .map(parseField)
        .join()
}

function parseField(field: Field): string {
    if (typeof field === 'string') {
        return field
    } else if (field.name && Array.isArray(field.fields)) {
        return `${field.name}[${field.fields.map(parseField).join()}]`
    } else {
        throw new Error('Could not parse query fields')
    }
}
