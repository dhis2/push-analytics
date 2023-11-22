import { insertIntoReportsTemplate } from '../templates'
import { ConverterFn, ReportType } from '../types'
import { createTimer } from '../utils'

// See https://github.com/dhis2/dashboard-app/blob/master/src/modules/itemTypes.js
const getPath = (id: string, type: ReportType) => {
    switch (type) {
        case 'HTML':
            return `dhis-web-reports/#/standard-report/view/${id}`
        case 'JASPER_REPORT_TABLE':
        case 'JASPER_JDBC':
        default:
            return `api/reports/${id}/data.pdf?t=${new Date().getTime()}`
    }
}

export const parseReports: ConverterFn = (dashboardItem, page) => {
    const reports = dashboardItem?.reports

    if (!reports || (Array.isArray(reports) && reports.length === 0)) {
        throw new Error(
            'function `parseReports` received a `dashboardItem` without any reports'
        )
    }

    const timer = createTimer()
    const baseUrl = page.getDhis2BaseUrl()

    const html = insertIntoReportsTemplate(
        reports.map(({ name, type, id }) => ({
            name,
            url: `${baseUrl}/${getPath(id, type)}`,
        }))
    )

    console.log(`Converted reports list in ${timer.getElapsedTime()} sec`)

    return Promise.resolve(html)
}
