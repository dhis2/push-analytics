import http from 'node:http'
import type { PrimaryProcess } from '../PrimaryProcess'
import type { PushAnalyticsEnvVariables } from '../types'
import { debugLog } from '../debugLog'

export function createHttpServer(
    primaryProcess: PrimaryProcess,
    env: PushAnalyticsEnvVariables
) {
    return http
        .createServer(primaryProcess.requestListener)
        .listen(env.port, parseInt(env.host), () => {
            debugLog(
                `DHIS2 Push Analytics Service is running on http://${env.host}:${env.port}`
            )
        })
}
