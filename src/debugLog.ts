import cluster from 'node:cluster'
import { readEnvVariable } from './Cluster/readEnv'
import type { LogLevel } from './types'

export function debugLog(...args: unknown[]) {
    const logLevel = readEnvVariable('LOG_LEVEL') as LogLevel

    if (logLevel === 'on' || logLevel === 'verbose') {
        // Do not log full objects and functions unless log level is verbose
        if (logLevel !== 'verbose') {
            for (let index = 0; index < args.length; index++) {
                if (typeof args[index] === 'object') {
                    args[index] = '[Object]'
                }
                if (typeof args[index] === 'function') {
                    args[index] = '[Function]'
                }
            }
        }
        // Visually differentiate between primary and worker processes
        const leadingArgs = cluster.isPrimary
            ? [
                  // Magenta for primary process
                  '\x1b[35m',
                  `[PRIMARY PROCESS ${process.pid}]:`,
              ]
            : [
                  // Cyan for worker process
                  '\x1b[36m',
                  `[WORKER PROCESS ${process.pid}]:`,
              ]
        const allArgs = [
            ...leadingArgs,
            // Reset console text color
            '\x1b[0m',
            ...args,
        ]
        console.log(...allArgs)
    }
}
