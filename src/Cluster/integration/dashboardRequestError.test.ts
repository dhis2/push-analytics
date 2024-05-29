import assert from 'node:assert'
import cluster from 'node:cluster'
import { after, before, describe, test } from 'node:test'
import request from 'supertest'
import type {
    PrimaryProcessEmittedMessage,
    WorkerProcessEmittedMessage,
} from '../../types'
import type { DashboardFixture } from './utils'
import {
    awaitMessageCount,
    getDashboardFixturesArray,
    getHttpServer,
    initializeMockCluster,
} from './utils'
import { tearDownCluster } from './utils/tearDownCluster'

describe('An error on the dashboard request', { concurrency: 1 }, () => {
    const dashboardFixtures: DashboardFixture[] = getDashboardFixturesArray()

    before(async () => {
        await initializeMockCluster(dashboardFixtures, '1')
    })

    after(async () => {
        /* These test files are being executed indipendently both by the primary
         * process and the worker process. When the tests are completed we need to
         * ensure cluster is destroyed. In the context of a test, the primary
         * process has a clear lifecycle: it starts by issuing a requests and ends
         * when the response is sent. The worker process does not have a clear
         * lifecycle but in the other tests we work around this by using a single
         * worker process and relying on the fact that we know which messages
         * it will receive from the primary process and waiting those messages (see
         * `awaitMessageCount` helper). In this particular test we cannot rely on
         * this workaround, since no messages are being exchanged between the
         * primary and worker process and the only way we are able to ensure
         * the test for the worker thread doesn't finish too soon is by waiting a
         * little while before destroying the cluster. This is not ideal but seems
         * to work OK. I would have expected that a timeout of ~1.5 times as much
         * as the time specified to wait for a message would have been sufficient,
         * but it was not. 1 second has proved to be sufficient. */
        await tearDownCluster(1000)
    })

    if (cluster.isPrimary) {
        test('the primary process does not receive any messages and sends the correct error response', async () => {
            const dashboardId = 'IAMNOTAVALIDID'
            const messagesFromWorkers: WorkerProcessEmittedMessage[] = []
            cluster.on('message', (_, message) => {
                messagesFromWorkers.push(message)
            })
            const response = await request(getHttpServer()).get(
                `/?dashboardId=${dashboardId}&username=admin&locale=en`
            )

            assert.strictEqual(messagesFromWorkers.length, 0)

            assert.strictEqual(response.status, 400)
            assert.strictEqual(
                response.text,
                'REQUEST HANDLER ERROR (E1502): Invalid dashhboard UID "IAMNOTAVALIDID"'
            )
        })
    } else {
        test('the worker process does not receive any messages', async () => {
            /* The main worker always replies when a worker requests a dashboard
             * item. If the queue is empty, so is the payload. */
            const expectedMessage = { type: 'ITEM_TAKEN_FROM_QUEUE' }
            const messagesFromPrimaryProcess: PrimaryProcessEmittedMessage[] =
                await awaitMessageCount(1)

            assert.strictEqual(messagesFromPrimaryProcess.length, 1)
            assert.deepEqual(messagesFromPrimaryProcess[0], expectedMessage)
        })
    }
})
