import cluster from 'node:cluster'
import http from 'node:http'
import process from 'node:process'

import { DashboardItemConversionWorker } from './worker'
import { PrimaryProcess } from './main'
import { readEnv } from './utils'

const initializeCluster = async () => {
    const env = readEnv()

    if (cluster.isPrimary) {
        const primaryProcess = new PrimaryProcess(env)
        primaryProcess.spawnWorkers()

        http.createServer(primaryProcess.requestListener).listen(
            env.port,
            parseInt(env.host),
            () => {
                console.log(
                    `DHIS2 Push Analytics Service is running on http://${env.host}:${env.port}`
                )
            }
        )
    } else {
        console.log(
            `Starting dashboard-item conversion worker on PID ${process.pid}`
        )
        const conversionWorker = new DashboardItemConversionWorker(env, false)
        await conversionWorker.init()
    }
}

initializeCluster()
