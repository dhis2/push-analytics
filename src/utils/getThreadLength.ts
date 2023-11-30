import { availableParallelism } from 'node:os'

export const getThreadLength = () => {
    if (process.env.MAX_THREADS) {
        return parseInt(process.env.MAX_THREADS)
    }

    const availableThreads = availableParallelism()

    if (availableThreads < 4) {
        return availableThreads
    } else if (availableThreads < 8) {
        return 4
    } else {
        return Math.ceil(availableThreads / 2)
    }
}
