import type { IncomingMessage } from 'http'
import { URL } from 'node:url'
import { HttpError } from '../../types'

const TYPE_JSON = 'application/json'
const TYPE_ANY = '*/*'

export function validateRequest(request: IncomingMessage, baseUrl: string) {
    const url = new URL(request.url ?? '', baseUrl)
    const methodType = request.method?.toUpperCase() ?? ''

    if (url.pathname !== '/') {
        throw new HttpError('The only available path is "/"', 404)
    }

    if (methodType !== 'GET') {
        throw new HttpError('Only requests of type "GET" are allowed', 405)
    }

    if (!isAllowedHeaderFieldType(request, 'content-type')) {
        throw new HttpError(`"content-type" request header must be "${TYPE_JSON}"`, 400)
    }

    if (!isAllowedHeaderFieldType(request, 'accept')) {
        throw new HttpError(
            `"accept" request header must be "${TYPE_JSON}" or "${TYPE_ANY}"`,
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
