import http from 'http'
import { parseDashBoardId } from './parseDashBoardId'
import { DashboardToEmailConverter } from './DashboardToEmailConverter'
import { HttpResponseStatusError } from './HttpResponseStatusError'
import { validateRequest } from './validateRequest'
import { readEnv } from './readEnv'

const {
    host,
    port,
    dhis2CoreUrl,
    dhis2CoreMajorVersion,
    dhis2CoreUsername,
    dhis2CorePassword,
} = readEnv()

const dashboardToEmailConverter = new DashboardToEmailConverter({
    dhis2CoreUrl,
    dhis2CoreMajorVersion,
    dhis2CoreUsername,
    dhis2CorePassword,
})

const server = http.createServer(async (req, res) => {
    try {
        validateRequest(req)
        const dashboardId = parseDashBoardId(req.url)
        const html = await dashboardToEmailConverter.convert(dashboardId)
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
