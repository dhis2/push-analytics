import { PushAnalyticsError } from './PushAnalyticsError'

export function parseError(error: unknown): { httpStatusCode: number; message: string } {
    let httpStatusCode = 500
    let message = 'Internal error'

    if (error instanceof PushAnalyticsError) {
        httpStatusCode = error.httpResponseStatusCode
        message = error.formattedMessage()
    } else if (error instanceof Error) {
        message = error.message
    }

    return { httpStatusCode, message }
}
