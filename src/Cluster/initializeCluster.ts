import cluster from 'node:cluster'
import process from 'node:process'
import { PrimaryProcess } from '../PrimaryProcess'
import { WorkerProcess } from '../WorkerProcess'
import { readEnv } from './readEnv'
import { createHttpServer } from './createHttpServer'

export const initializeCluster = async () => {
    const env = readEnv()

    if (cluster.isPrimary) {
        const primaryProcess = new PrimaryProcess(env)
        createHttpServer(primaryProcess, env)
    } else {
        console.log(`Starting dashboard-item conversion worker on PID ${process.pid}`)
        await WorkerProcess.create(env, false)
    }
}
