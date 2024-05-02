import cluster from 'node:cluster'
import type { Server as HttpServer } from 'node:http'
import type { PushAnalyticsEnvVariables } from '../../../types'
import { PrimaryProcess } from '../../../PrimaryProcess'
import { createHttpServer } from '../../createHttpServer'
import { DashboardFixture } from './getDashboardFixture'
import { MockWorkerProcess } from './MockWorkerProcess'
import { nockDashboardsResponses } from './nockDashboardsResponses'

const { getHttpServer, setHttpServer } = (() => {
    let httpServer: HttpServer | null = null
    return {
        getHttpServer() {
            if (!httpServer) {
                throw new Error('Tried to get httpServer before setting it')
            }
            return httpServer
        },
        setHttpServer(newHttpServer: HttpServer) {
            httpServer = newHttpServer
            return httpServer
        },
    }
})()

const initializeMockCluster = async (
    dashboardsFixtures: DashboardFixture[],
    maxThreads: string = '4'
) => {
    const env: PushAnalyticsEnvVariables = {
        host: 'localhost',
        port: '1337',
        baseUrl: 'http://localhost:8080',
        apiVersion: '40',
        adminUsername: 'admin',
        adminPassword: 'district',
        maxThreads: maxThreads,
        sessionTimeout: '3600',
        nodeEnv: 'testing',
        logLevel: 'off',
    }

    if (cluster.isPrimary) {
        nockDashboardsResponses(env, dashboardsFixtures)
        const primaryProcess = new PrimaryProcess(env)
        const server = createHttpServer(primaryProcess, env)
        setHttpServer(server)
        return Promise.resolve()
    } else {
        await MockWorkerProcess.create()
    }
}

export { initializeMockCluster, DashboardFixture, getHttpServer }
