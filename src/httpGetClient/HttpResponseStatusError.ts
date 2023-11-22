export class HttpResponseStatusError extends Error {
    status: number

    constructor(message: string, status: number) {
        super(message)
        this.status = status
        this.name = 'HttpResponseStatusError'
    }
}
