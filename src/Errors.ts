export class HttpError extends Error {
    statusCode: number

    constructor(message: string, statusCode: number) {
        super(message)
        this.statusCode = statusCode
        this.name = 'Error'
    }
}

export class ConversionHttpError extends HttpError {
    constructor(message: string) {
        super(`CONVERSION ERROR: ${message}`, 500)
        this.name = 'ConversionError'
    }
}
