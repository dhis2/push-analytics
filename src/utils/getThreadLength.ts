import { availableParallelism } from 'node:os'

export const getThreadLength = (maxThreads: string = '') => {
    const availableThreads = availableParallelism()

    if (maxThreads) {
        if (maxThreads.toLowerCase() === 'max') {
            return availableThreads
        }
        return parseInt(maxThreads)
    }

    if (availableThreads < 4) {
        return availableThreads
    } else if (availableThreads < 8) {
        return 4
    } else {
        return Math.ceil(availableThreads / 2)
    }
}
