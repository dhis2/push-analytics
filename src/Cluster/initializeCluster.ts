import cluster from 'node:cluster'
import { PrimaryProcess } from '../PrimaryProcess'
import { WorkerProcess } from '../WorkerProcess'
import { debugLog } from '../debugLog'
import { createHttpServer } from './createHttpServer'
import { readEnv } from './readEnv'

export const initializeCluster = async () => {
    const env = readEnv()

    if (cluster.isPrimary) {
        const primaryProcess = new PrimaryProcess(env)
        createHttpServer(primaryProcess, env)
    } else {
        debugLog(`Starting dashboard-item conversion worker`)
        await WorkerProcess.create(env, false)
    }
}
