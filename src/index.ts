import http from 'http'
import { parseDashBoardId } from './utils/parseDashBoardId'
import { HttpResponseStatusError } from './utils/HttpResponseStatusError'
import { validateRequest } from './validateRequest'
import { readEnv } from './utils/readEnv'
import { convertDashboardToEmailHtml } from './convertDashboardToEmailHtml'

const { host, port, baseUrl, apiVersion, username, password } = readEnv()

const server = http.createServer(async (req, res) => {
    try {
        validateRequest(req)
        const dashboardId = parseDashBoardId(req.url)
        const html = await convertDashboardToEmailHtml({
            dashboardId,
            baseUrl,
            apiVersion,
            username,
            password,
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
})
server.listen(port, parseInt(host), () => {
    console.log(
        `DHIS2 Push Analytics server is running on http://${host}:${port}`
    )
})
