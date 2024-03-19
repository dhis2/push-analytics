import cluster from 'node:cluster'
import http from 'node:http'
import process from 'node:process'
import { PrimaryProcess } from '../PrimaryProcess'
import { WorkerProcess } from '../WorkerProcess'
import { readEnv } from './readEnv'

export const initializeCluster = async () => {
    const env = readEnv()

    if (cluster.isPrimary) {
        const primaryProcess = new PrimaryProcess(env)

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
        console.log(`Starting dashboard-item conversion worker on PID ${process.pid}`)
        await WorkerProcess.create(env, false)
    }
}
