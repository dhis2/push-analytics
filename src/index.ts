import cluster from 'node:cluster'
import http from 'node:http'
import process from 'node:process'
import { HttpResponseStatusError, getDashboard } from './httpGetClient'
import {
    createTimer,
    parseQueryString,
    readEnv,
    validateRequest,
} from './utils'
import { waitMs } from './puppeteer-utils'
import { DashboardsConverter } from './cluster/main'
import type {
    ConverterReadyMessage,
    ConversionRequestMessage,
    ConversionResultMessage,
    QueueItem,
    ConvertedItem,
} from './cluster/main/types'

const init = async () => {
    const { host, port, baseUrl, apiVersion } = readEnv()

    if (cluster.isPrimary) {
        const dashboardsConverter = new DashboardsConverter()

        http.createServer(async (req, res) => {
            try {
                console.log('Received request')
                const timer = createTimer()
                validateRequest(req)
                const { dashboardId, username, password } = parseQueryString(
                    req.url,
                    baseUrl
                )
                const { displayName, dashboardItems } = await getDashboard(
                    apiVersion,
                    baseUrl,
                    dashboardId,
                    password,
                    username
                )
                dashboardsConverter.addDashboard({
                    dashboardId,
                    displayName,
                    dashboardItems,
                    username,
                    password,
                    onComplete: (html: string) => {
                        console.log(
                            `Converted dashboard "${displayName}" (${dashboardId}) in ${timer.getElapsedTime()} seconds`
                        )
                        res.writeHead(200)
                        res.end(html)
                    },
                })
            } catch (error) {
                if (error instanceof HttpResponseStatusError) {
                    res.writeHead(error.status)
                } else {
                    res.writeHead(500)
                }
                if (error instanceof Error) {
                    res.end(error.message)
                } else {
                    res.end('An unknown error occurred')
                }
            }
        }).listen(port, parseInt(host), () => {
            console.log(
                `DHIS2 Push Analytics server is running on http://${host}:${port}`
            )
        })
    } else {
        console.log(`Worker ${process.pid} started`)

        const createDashboardItemConverter = async () => {
            // Simulate setup time
            await waitMs(1000)
            return async function convert(queueItem: QueueItem) {
                // Simulate conversion time
                await waitMs(3000)
                return {
                    dashboardId: queueItem.dashboardId,
                    username: queueItem.username,
                    dashboardItemId: queueItem.dashboardItem.id,
                    html: '<h1>HENKIE</h1>',
                    css: '.HENKIE { color:red }',
                } as ConvertedItem
            }
        }
        const convert = await createDashboardItemConverter()

        if (!process?.send) {
            throw new Error('Cannont send message from worker to main thread')
        }

        process.send({ type: 'ITEM_CONVERTER_READY' } as ConverterReadyMessage)
        process.on('message', async (message: ConversionRequestMessage) => {
            if (
                message?.type !== 'ITEM_CONVERSION_REQUEST' ||
                !message.payload
            ) {
                throw new Error(
                    `Received unexpected message with type "${message?.type}"`
                )
            }
            const queueItem: QueueItem = message.payload
            const convertedItem: ConvertedItem = await convert(queueItem)

            if (!process?.send) {
                throw new Error(
                    'Cannont send message from worker to main thread'
                )
            }
            process.send({
                type: 'ITEM_CONVERSION_RESULT',
                payload: convertedItem,
            } as ConversionResultMessage)
        })
    }
}

init()
