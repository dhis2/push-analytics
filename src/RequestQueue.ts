type RequestHandler = () => Promise<void>
export class RequestQueue {
    #idle: boolean
    #queue: RequestHandler[]

    constructor() {
        this.#idle = false
        this.#queue = []
    }

    enqueue(requestHandler: RequestHandler) {
        this.#queue.push(requestHandler)

        if (this.#idle) {
            this.#dequeue()
        }
    }

    onStartupCompleted() {
        this.#idle = true
        this.#dequeue()
    }

    onCompleted() {
        this.#idle = true
        this.#dequeue()
    }

    #dequeue() {
        const requestHandler = this.#queue.shift()

        if (requestHandler) {
            this.#idle = false
            requestHandler()
        }
    }
}
