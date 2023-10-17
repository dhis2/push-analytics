import http from 'http'
import { HttpResponseStatusError } from './HttpResponseStatusError'

const TYPE_JSON = 'application/json'
const TYPE_ANY = '*/*'

const isAllowedHeaderFieldType = (
    req: http.IncomingMessage,
    headerField: string
) => {
    const headerValue = req.headers[headerField] ?? ''

    return (
        headerValue.includes(TYPE_JSON) ||
        headerValue.includes(TYPE_ANY) ||
        // TODO: possibly remove this
        headerValue === ''
    )
}

export const validateRequest = (req: http.IncomingMessage) => {
    const methodType = req.method?.toUpperCase() ?? ''

    if (!isAllowedHeaderFieldType(req, 'content-type')) {
        throw new HttpResponseStatusError(
            `"content-type" request header must be ${TYPE_JSON}"`,
            400
        )
    }

    if (!isAllowedHeaderFieldType(req, 'accept')) {
        throw new HttpResponseStatusError(
            `"accept" request header must be ${TYPE_JSON} or ${TYPE_ANY}`,
            400
        )
    }

    if (methodType !== 'GET') {
        throw new HttpResponseStatusError('Request method must be GET', 405)
    }
}
