import http from 'http'
import { convertDashboardToEmailHtml } from './convertDashboardToEmailHtml'
import { HttpResponseStatusError } from './httpGetClient'
import { parseDashboardId, readEnv, validateRequest } from './utils'

const { host, port, baseUrl, apiVersion, username, password } = readEnv()

http.createServer(async (req, res) => {
    try {
        validateRequest(req)
        const dashboardId = parseDashboardId(req.url)
        const html = await convertDashboardToEmailHtml({
            dashboardId,
            baseUrl,
            apiVersion,
            username,
            password,
            debug: false,
        })
        res.writeHead(200)
        res.end(html)
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
