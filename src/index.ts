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
import { DashboardsConverter } from './cluster/main'
import { DashboardItemConversionWorker } from './cluster'

const init = async () => {
    const { host, port, baseUrl, apiVersion } = readEnv()

    if (cluster.isPrimary) {
        const dashboardsConverter = new DashboardsConverter(baseUrl)

        http.createServer(async (req, res) => {
            try {
                console.log(req.url)
                if (req.url === '/favicon.ico') {
                    res.writeHead(200)
                    res.end('')
                    return
                }
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
        return new DashboardItemConversionWorker(baseUrl, false)
    }
}

init()
