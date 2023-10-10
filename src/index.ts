import http from 'http'
import { parseDashBoardId } from './parseDashBoardId'
import { DashboardToEmailConverter } from './DashboardToEmailConverter'
import { HttpResponseStatusError } from './HttpResponseStatusError'

const host = 'localhost'
const port = 1337

const dashboardToEmailConverter = new DashboardToEmailConverter('a', 'b', 'c')

const server = http.createServer(async (req, res) => {
    try {
        const dashboardId = parseDashBoardId(req.url)
        const html = await dashboardToEmailConverter.convert(dashboardId)
        res.writeHead(200)
        res.end(html)
    } catch (error: unknown) {
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
server.listen(port, host, () => {
    console.log(
        `DHIS2 Push Analytics server is running on http://${host}:${port}`
    )
})
