import { insertIntoReportsTemplate } from '../templates'
import type { QueueItem, ReportType } from '../types'
import { createTimer } from '../utils'
import { AnchorParser } from './base/AnchorParser'

export class ReportsParser extends AnchorParser {
    #path(id: string, type: ReportType) {
        switch (type) {
            case 'HTML':
                return `dhis-web-reports/#/standard-report/view/${id}`
            case 'JASPER_REPORT_TABLE':
            case 'JASPER_JDBC':
            default:
                return `api/reports/${id}/data.pdf?t=${new Date().getTime()}`
        }
    }

    async convert(queueItem: QueueItem) {
        const reports = queueItem?.dashboardItem?.reports

        if (!reports || (Array.isArray(reports) && reports.length === 0)) {
            throw new Error(
                'function `parseReports` received a `dashboardItem` without any reports'
            )
        }

        const timer = createTimer()

        const html = insertIntoReportsTemplate(
            reports.map(({ name, type, id }) => ({
                name,
                url: `${this.baseUrl}/${this.#path(id, type)}`,
            }))
        )

        console.log(`Converted reports list in ${timer.getElapsedTime()} sec`)

        return Promise.resolve(html)
    }
}
