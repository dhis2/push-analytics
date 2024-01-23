import cluster from 'node:cluster'
import http from 'node:http'
import process from 'node:process'
import { HttpResponseStatusError, createDashboardGetter } from './httpGetClient'
import { DashboardsConverter } from './main'
import {
    createTimer,
    parseQueryString,
    readEnv,
    validateRequest,
} from './utils'
import { DashboardItemConversionWorker } from './worker'
import { RequestQueue } from './RequestQueue'

const initializeCluster = async () => {
    const {
        host,
        port,
        baseUrl,
        apiVersion,
        adminUsername,
        adminPassword,
        maxThreads,
        sessionTimeout,
    } = readEnv()

    if (cluster.isPrimary) {
        // TODO: figure out why things break when requests are not queued, in theory it should not be needed
        const requestQueue = new RequestQueue()
        const onStartUpCompleted = () => {
            requestQueue.onStartupCompleted()
        }
        const dashboardsConverter = new DashboardsConverter(
            baseUrl,
            maxThreads,
            onStartUpCompleted
        )
        const getDashboard = createDashboardGetter({
            apiVersion,
            baseUrl,
            username: adminUsername,
            password: adminPassword,
        })

        http.createServer(async (req, res) => {
            try {
                if (req.url === '/favicon.ico') {
                    res.writeHead(200)
                    res.end('')
                    return
                }
                console.log('Conversion process started')
                const requestHandler = async () => {
                    const timer = createTimer()
                    validateRequest(req)
                    const { dashboardId, username } = parseQueryString(
                        req.url,
                        baseUrl
                    )
                    const { displayName, dashboardItems } = await getDashboard(
                        dashboardId
                    )
                    dashboardsConverter.addDashboard({
                        dashboardId,
                        displayName,
                        dashboardItems,
                        username,
                        onComplete: (html: string) => {
                            console.log(
                                `++++ Converted dashboard "${displayName}" (${dashboardId}) in ${timer.getElapsedTime()} seconds ++++`
                            )
                            res.writeHead(200)
                            res.end(html)
                            requestQueue.onCompleted()
                        },
                    })
                }
                requestQueue.enqueue(requestHandler)
            } catch (error) {
                console.log(error)
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
        console.log(
            `Starting dashboard-item conversion worker on PID ${process.pid}`
        )
        const conversionWorker = new DashboardItemConversionWorker({
            debug: false,
            baseUrl,
            apiVersion,
            adminUsername,
            adminPassword,
            sessionTimeout,
        })
        await conversionWorker.init()
    }
}

initializeCluster()
