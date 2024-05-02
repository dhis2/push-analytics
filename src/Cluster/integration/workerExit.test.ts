import assert from 'node:assert'
import cluster from 'node:cluster'
import { after, before, describe, test } from 'node:test'
import request from 'supertest'
import type { DashboardFixture } from './utils'
import {
    getDashboardFixturesArray,
    getHttpServer,
    getOutputFixture,
    initializeMockCluster,
    waitMs,
} from './utils'
import { tearDownCluster } from './utils/tearDownCluster'

describe('Handling a worker exit', async () => {
    const dashboardFixtures: DashboardFixture[] = getDashboardFixturesArray()

    before(async () => {
        await initializeMockCluster(dashboardFixtures, '1')
    })

    after(async () => {
        await tearDownCluster()
    })

    const dashboardId1 = 'iMnYyBfSxmM'
    const dashboardId2 = 'nghVC4wtyzi'
    const dashboardId3 = 'rmPiJIPFL4U'
    const outputHtml3 = getOutputFixture(dashboardId3)

    if (cluster.isPrimary) {
        test('the primary process receives the expected messages and sends the correct responses', async () => {
            let messageCount = 0
            let killedWorkerPID: number | undefined
            cluster.on('message', (worker) => {
                ++messageCount
                // Allow some messages to be sent back and forward and then kill the worker
                if (messageCount === 5) {
                    killedWorkerPID = worker.process.pid
                    worker.kill()
                }
            })
            // Note the `Promise.all`, the requests are issued in parallel
            const [response1, response2] = await Promise.all([
                request(getHttpServer()).get(
                    `/?dashboardId=${dashboardId1}&username=admin`
                ),
                request(getHttpServer()).get(
                    `/?dashboardId=${dashboardId2}&username=admin`
                ),
            ])

            // All pending requests send an error reply
            assert.strictEqual(response1.status, 500)
            assert.strictEqual(
                response1.text,
                'PRIMARY PROCESS ERROR (E1102): Conversion worker with ID "1" crashed, need to restart'
            )
            assert.strictEqual(response2.status, 500)
            assert.strictEqual(
                response2.text,
                'PRIMARY PROCESS ERROR (E1102): Conversion worker with ID "1" crashed, need to restart'
            )

            // Allow for a reboot time
            await waitMs(200)
            const allWorkerPIDs = Object.keys(cluster.workers ?? {}).map(
                (id) => cluster.workers?.[id]?.process.pid
            )
            // Assert that the old worker PID is not present now
            assert.strictEqual(
                allWorkerPIDs.some((PID) => PID === killedWorkerPID),
                false
            )
            // Try a new request, which should pass
            const response3 = await request(getHttpServer()).get(
                `/?dashboardId=${dashboardId3}&username=admin`
            )
            assert.strictEqual(response3.status, 200)
            assert.strictEqual(response3.text, outputHtml3)
        })
    } else {
        /* Note that we do not test the worker process here since we force
         * it to die in the primary process */
    }
})
