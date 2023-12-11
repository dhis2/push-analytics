import { availableParallelism } from 'node:os'

export const getThreadLength = () => {
    const availableThreads = availableParallelism()

    if (process.env.MAX_THREADS) {
        if ((process.env.MAX_THREADS ?? '').toLowerCase() === 'max') {
            return availableThreads
        }
        return parseInt(process.env.MAX_THREADS)
    }

    if (availableThreads < 4) {
        return availableThreads
    } else if (availableThreads < 8) {
        return 4
    } else {
        return Math.ceil(availableThreads / 2)
    }
}
