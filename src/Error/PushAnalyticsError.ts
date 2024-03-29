export class PushAnalyticsError extends Error {
    name: string
    errorCode: string
    httpResponseStatusCode: number

    constructor(
        message: string,
        errorCode: string,
        httpResponseStatusCode: number,
        name?: string
    ) {
        super(message)
        this.name = name ?? this.constructor.name
        this.httpResponseStatusCode = httpResponseStatusCode
        this.errorCode = errorCode
    }

    formattedMessage() {
        const upperCasedName = this.name.replace(/[A-Z]/g, ' $&').trim().toUpperCase()
        return `${upperCasedName} (${this.errorCode}): ${this.message}`
    }
}
