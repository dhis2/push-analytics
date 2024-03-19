import { PushAnalyticsError } from '../../Error'

export class AppScraperError extends PushAnalyticsError {
    constructor(
        message: string,
        errorCode: string = 'E2201',
        httpResponseStatusCode: number = 500
    ) {
        super(message, errorCode, httpResponseStatusCode)
    }
}
