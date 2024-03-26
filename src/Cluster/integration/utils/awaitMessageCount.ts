import type { PrimaryProcessEmittedMessage } from '../../../types'

export async function awaitMessageCount(
    count: number
): Promise<PrimaryProcessEmittedMessage[]> {
    return new Promise((resolve) => {
        const receivedMessages: PrimaryProcessEmittedMessage[] = []
        process.on('message', (message) => {
            receivedMessages.push(message as PrimaryProcessEmittedMessage)

            if (receivedMessages.length === count) {
                resolve(receivedMessages)
            }
        })
    })
}
