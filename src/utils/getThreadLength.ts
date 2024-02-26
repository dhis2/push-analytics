import { availableParallelism } from 'node:os'

export function getThreadLength(maxThreads: string = ''): number {
    const availableThreads = availableParallelism()

    if (maxThreads) {
        if (maxThreads.toLowerCase() === 'max') {
            return availableThreads
        }
        return Math.min(parseInt(maxThreads), availableThreads)
    }

    return Math.ceil(availableThreads / 2)
}
