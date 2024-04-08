import type { IncomingMessage } from 'http'
import { URL } from 'node:url'
import { RequestHandlerError } from './RequestHandlerError'

const TYPE_JSON = 'application/json'
const TYPE_ANY = '*/*'
const LOCALHOST_IPS = ['localhost', '::', '::1', '127.0.0.0']

export function validateRequest(request: IncomingMessage, baseUrl: string) {
    const url = new URL(request.url ?? '', baseUrl)
    const methodType = request.method?.toUpperCase() ?? ''
    const remoteAddress =
        request.socket.remoteAddress ?? request.socket.address.toString()
    const isAllowedRemoteAddress =
        remoteAddress.includes(baseUrl) ||
        LOCALHOST_IPS.some((ip) => remoteAddress.includes(ip))

    if (!isAllowedRemoteAddress) {
        throw new RequestHandlerError(`Request not allowed from this IP`, 'E1506', 403)
    }

    if (url.pathname !== '/') {
        throw new RequestHandlerError(
            `Invalid pathname "${url.pathname}", the only available path is "/"`,
            'E1503',
            404
        )
    }

    if (methodType !== 'GET') {
        throw new RequestHandlerError(
            'Only requests of type "GET" are allowed',
            'E1504',
            405
        )
    }

    if (!isAllowedHeaderFieldType(request, 'content-type')) {
        throw new RequestHandlerError(
            `"content-type" request header must be "${TYPE_JSON}" or "${TYPE_ANY}"`,
            'E1505',
            400
        )
    }

    if (!isAllowedHeaderFieldType(request, 'accept')) {
        throw new RequestHandlerError(
            `"accept" request header must be "${TYPE_JSON}" or "${TYPE_ANY}"`,
            'E1505',
            400
        )
    }
}

function isAllowedHeaderFieldType(request: IncomingMessage, headerField: string) {
    const headerValue = request.headers[headerField] ?? ''

    return (
        headerValue.includes(TYPE_JSON) ||
        headerValue.includes(TYPE_ANY) ||
        headerValue === ''
    )
}
