import assert from 'node:assert'
import cluster from 'node:cluster'
import { after, before, describe, mock, test } from 'node:test'
import request from 'supertest'
import { AppScraperError } from '../../WorkerProcess/AppScraperUtils/AppScraperError'
import type {
    PrimaryProcessEmittedMessage,
    QueueItem,
    WorkerProcessEmittedMessage,
} from '../../types'
import type { DashboardFixture } from './utils'
import {
    MockDashboardItemConverter,
    awaitMessageCount,
    convertSuccessFn,
    getDashboardFixture,
    getDashboardFixturesArray,
    getHttpServer,
    getOutputFixture,
    initializeMockCluster,
} from './utils'
import { tearDownCluster } from './utils/tearDownCluster'

describe('Conversion error', { concurrency: 1 }, async () => {
    const dashboardFixtures: DashboardFixture[] = getDashboardFixturesArray()

    before(async () => {
        await initializeMockCluster(dashboardFixtures, '1')
    })

    after(async () => {
        await tearDownCluster()
    })

    // Dashboard item "ANC: IPT 2 Coverage this year" on dashboard "Antenatal Care" (nghVC4wtyzi)
    const failureDashboardItemId = 'i6NTSuDsk6l'
    const errorMessage = `Conversion failed because item id equals ${failureDashboardItemId}`
    const dashboardId1 = 'iMnYyBfSxmM'
    const dashboardId2 = 'nghVC4wtyzi'
    const dashboardId3 = 'rmPiJIPFL4U'
    const dashboardItems1 = getDashboardFixture(dashboardId1).dashboardItems
    const dashboardItems2 = getDashboardFixture(dashboardId2).dashboardItems
    const dashboardItems3 = getDashboardFixture(dashboardId3).dashboardItems
    const allDashboardItems = [...dashboardItems1, ...dashboardItems2, ...dashboardItems3]
    const outputHtml1 = getOutputFixture(dashboardId1)
    const outputHtml3 = getOutputFixture(dashboardId3)

    mock.method(
        MockDashboardItemConverter.prototype,
        'convert',
        async (queueItem: QueueItem) => {
            if (queueItem.dashboardItem.id === failureDashboardItemId) {
                throw new AppScraperError(errorMessage)
            }
            return await convertSuccessFn(queueItem)
        }
    )

    if (cluster.isPrimary) {
        test('the primary process clears the queue, sends an error for the failure and handles both other requests correctly', async () => {
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
            const itemConvertedMessages = messagesFromWorkers.filter(
                ({ type }) => type === 'ITEM_CONVERTED'
            )
            const itemConversionFailureMessages = messagesFromWorkers.filter(
                ({ type }) => type === 'ITEM_CONVERSION_ERROR'
            )

            /* When a conversion fails the sibling dashboard items are removed from the
             * queue and as a result fewer items should be converted than the total. */
            assert.strictEqual(
                itemConvertedMessages.length < allDashboardItems.length,
                true
            )
            // We should find one error message
            assert.strictEqual(itemConversionFailureMessages.length, 1)
            // First request should be good
            assert.strictEqual(response1.status, 200)
            assert.strictEqual(response1.text, outputHtml1)
            // Second request contains the conversion failure
            assert.strictEqual(response2.status, 500)
            assert.strictEqual(
                response2.text,
                `APP SCRAPER ERROR (E2201): ${errorMessage}`
            )
            // Third request should be good
            assert.strictEqual(response3.status, 200)
            assert.strictEqual(response3.text, outputHtml3)
        })
    } else {
        test('the worker process receives the expected messages', async () => {
            /* One `ITEMS_ADDED_TO_QUEUE` messages for each request
             * plus one `ITEM_TAKEN_FROM_QUEUE` message per dashboard item
             * minus the amount of dashboarditems items that follow the failure (6) */
            const expectedMessageLength =
                3 +
                dashboardItems1.length +
                dashboardItems2.length +
                dashboardItems3.length -
                6
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
