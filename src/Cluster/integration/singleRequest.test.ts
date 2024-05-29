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

describe(
    'A successfull request response cycle for a single request',
    { concurrency: 1 },
    () => {
        const dashboardFixtures: DashboardFixture[] = getDashboardFixturesArray()

        before(async () => {
            await initializeMockCluster(dashboardFixtures, '1')
        })
        after(async () => {
            await tearDownCluster()
        })

        const dashboardId = 'iMnYyBfSxmM'
        const dashboardItems = getDashboardFixture(dashboardId).dashboardItems
        const convertedHtml = getOutputFixture(dashboardId)

        if (cluster.isPrimary) {
            test('the primary process receives the expected messages and sends the correct response', async () => {
                const messagesFromWorkers: WorkerProcessEmittedMessage[] = []
                cluster.on('message', (_, message) => {
                    messagesFromWorkers.push(message)
                })
                const response = await request(getHttpServer()).get(
                    `/?dashboardId=${dashboardId}&username=admin&locale=en`
                )
                const itemRequestedMessages = messagesFromWorkers.filter(
                    ({ type }) => type === 'ITEM_REQUESTED_FROM_QUEUE'
                )
                const itemConvertedMessages = messagesFromWorkers.filter(
                    ({ type }) => type === 'ITEM_CONVERTED'
                )
                /* The workers will keep requesting items when they are ready to do work,
                 * and the work is halted once they stop receiving a reply to their request.
                 * As a result there will always be at least 1 more `ITEM_REQUESTED_FROM_QUEUE`
                 * messages than there are dashboard-items */
                assert.strictEqual(
                    itemRequestedMessages.length > dashboardItems.length,
                    true
                )
                // One `ITEM_CONVERTED` message per dashboard item
                assert.strictEqual(dashboardItems.length, itemConvertedMessages.length)
                assert.strictEqual(
                    dashboardItems.every(({ id }) =>
                        itemConvertedMessages.some(
                            (message) => message.payload?.dashboardItemId === id
                        )
                    ),
                    true
                )
                assert.strictEqual(response.status, 200)
                assert(response.text, convertedHtml)
            })
        } else {
            test('the worker process receives the expected messages', async () => {
                const messagesFromPrimaryProcess: PrimaryProcessEmittedMessage[] =
                    await awaitMessageCount(dashboardItems.length + 1)
                const [firstMessage, ...subsequentMessages] = messagesFromPrimaryProcess

                assert.strictEqual(firstMessage.type, 'ITEMS_ADDED_TO_QUEUE')
                assert.strictEqual(
                    dashboardItems.length + 1,
                    messagesFromPrimaryProcess.length
                )
                assert.strictEqual(
                    subsequentMessages.every(
                        ({ type }) => type === 'ITEM_TAKEN_FROM_QUEUE'
                    ),
                    true
                )
                assert.strictEqual(subsequentMessages.length, dashboardItems.length)
            })
        }
    }
)
