import type { IncomingMessage } from 'http'
import { HttpResponseStatusError } from '../../types'

const TYPE_JSON = 'application/json'
const TYPE_ANY = '*/*'

const isAllowedHeaderFieldType = (request: IncomingMessage, headerField: string) => {
    const headerValue = request.headers[headerField] ?? ''

    return (
        headerValue.includes(TYPE_JSON) ||
        headerValue.includes(TYPE_ANY) ||
        // TODO: possibly remove this
        headerValue === ''
    )
}

export function validateRequest(request: IncomingMessage) {
    const methodType = request.method?.toUpperCase() ?? ''

    if (!isAllowedHeaderFieldType(request, 'content-type')) {
        throw new HttpResponseStatusError(
            `"content-type" request header must be ${TYPE_JSON}"`,
            400
        )
    }

    if (!isAllowedHeaderFieldType(request, 'accept')) {
        throw new HttpResponseStatusError(
            `"accept" request header must be ${TYPE_JSON} or ${TYPE_ANY}`,
            400
        )
    }

    if (methodType !== 'GET') {
        throw new HttpResponseStatusError('Request method must be GET', 405)
    }
}
