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
    getDashboardFixture,
    getDashboardFixturesArray,
    getHttpServer,
    getOutputFixture,
    initializeMockCluster,
} from './utils'
import { tearDownCluster } from './utils/tearDownCluster'

describe('Handling parallel requests', { concurrency: 1 }, () => {
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
    const dashboardItems1 = getDashboardFixture(dashboardId1).dashboardItems
    const dashboardItems2 = getDashboardFixture(dashboardId2).dashboardItems
    const dashboardItems3 = getDashboardFixture(dashboardId3).dashboardItems
    const allDashboardItems = [...dashboardItems1, ...dashboardItems2, ...dashboardItems3]
    const outputHtml1 = getOutputFixture(dashboardId1)
    const outputHtml2 = getOutputFixture(dashboardId2)
    const outputHtml3 = getOutputFixture(dashboardId3)

    if (cluster.isPrimary) {
        test('the primary process receives the expected messages and sends the correct responses', async () => {
            const messagesFromWorkers: WorkerProcessEmittedMessage[] = []
            cluster.on('message', (_, message) => {
                messagesFromWorkers.push(message)
            })
            // Note the `Promise.all`, the requests are issued in parallel
            const [response1, response2, response3] = await Promise.all([
                request(getHttpServer()).get(
                    `/?dashboardId=${dashboardId1}&username=admin`
                ),
                request(getHttpServer()).get(
                    `/?dashboardId=${dashboardId2}&username=admin`
                ),
                request(getHttpServer()).get(
                    `/?dashboardId=${dashboardId3}&username=admin`
                ),
            ])
            const itemRequestedMessages = messagesFromWorkers.filter(
                ({ type }) => type === 'ITEM_REQUESTED_FROM_QUEUE'
            )
            const itemConvertedMessages = messagesFromWorkers.filter(
                ({ type }) => type === 'ITEM_CONVERTED'
            )

            assert.strictEqual(
                itemRequestedMessages.length > allDashboardItems.length,
                true
            )
            assert.strictEqual(allDashboardItems.length, itemConvertedMessages.length)
            assert.strictEqual(
                allDashboardItems.every(({ id }) =>
                    itemConvertedMessages.some(
                        (message) => message.payload?.dashboardItemId === id
                    )
                ),
                true
            )
            assert.strictEqual(response1.status, 200)
            assert.strictEqual(response1.text, outputHtml1)
            assert.strictEqual(response2.status, 200)
            assert.strictEqual(response2.text, outputHtml2)
            assert.strictEqual(response3.status, 200)
            assert.strictEqual(response3.text, outputHtml3)
        })
    } else {
        test('the worker process receives the expected messages', async () => {
            /* One `ITEMS_ADDED_TO_QUEUE` messages for each request
             * plus one `ITEM_TAKEN_FROM_QUEUE` message per dashboard item */
            const expectedMessageLength =
                3 +
                dashboardItems1.length +
                dashboardItems2.length +
                dashboardItems3.length
            const messagesFromPrimaryProcess: PrimaryProcessEmittedMessage[] =
                await awaitMessageCount(expectedMessageLength)
            const itemsAddedMessages = messagesFromPrimaryProcess.filter(
                ({ type }) => type === 'ITEMS_ADDED_TO_QUEUE'
            )
            const itemTakenFromQueueMessages = messagesFromPrimaryProcess.filter(
                ({ type }) => type === 'ITEM_TAKEN_FROM_QUEUE'
            )

            assert.strictEqual(itemsAddedMessages.length, 3)
            assert.strictEqual(itemTakenFromQueueMessages.length > 0, true)
        })
    }
})
