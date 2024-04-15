import http from 'node:http'
import type { PrimaryProcess } from '../PrimaryProcess'
import type { PushAnalyticsEnvVariables } from '../types'

export function createHttpServer(
    primaryProcess: PrimaryProcess,
    env: PushAnalyticsEnvVariables
) {
    return http
        .createServer(primaryProcess.requestListener)
        .listen(env.port, parseInt(env.host), () => {
            if (env.nodeEnv !== 'testing') {
                console.log(
                    `DHIS2 Push Analytics Service is running on http://${env.host}:${env.port}`
                )
            }
        })
}
