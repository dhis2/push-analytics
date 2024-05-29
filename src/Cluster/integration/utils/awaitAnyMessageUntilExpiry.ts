import type { PrimaryProcessEmittedMessage } from '../../../types'

export async function awaitAnyMessageUntilExpiry(
    expiry: number
): Promise<PrimaryProcessEmittedMessage | null> {
    return await new Promise((resolve) => {
        const timeout = setTimeout(() => {
            resolve(null)
        }, expiry)
        process.on('message', (message) => {
            clearTimeout(timeout)
            resolve(message as PrimaryProcessEmittedMessage)
        })
    })
}
