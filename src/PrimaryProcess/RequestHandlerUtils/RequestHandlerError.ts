import { PushAnalyticsError } from '../../Error'

export class RequestHandlerError extends PushAnalyticsError {
    constructor(
        message: string,
        errorCode: string = 'E1501',
        httpResponseStatusCode: number = 500
    ) {
        super(message, errorCode, httpResponseStatusCode)
    }
}
