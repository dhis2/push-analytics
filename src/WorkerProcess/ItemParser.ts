import MdParser from '@dhis2/d2-ui-rich-text/parser/MdParser'
import type { Converter, ConverterResult, QueueItem, ReportType } from '../types'
import { insertIntoAnchorListTemplate, insertIntoTextTemplate } from './htmlTemplates'
import { PushAnalyticsError } from '../PushAnalyticsError'

class ItemParserError extends PushAnalyticsError {
    constructor(
        message: string,
        errorCode: string = 'E2501',
        httpResponseStatusCode: number = 500
    ) {
        super(message, errorCode, httpResponseStatusCode)
    }
}

export class ItemParser implements Converter {
    #baseUrl: string

    constructor(baseUrl: string) {
        this.#baseUrl = baseUrl
    }

    async convert(queueItem: QueueItem): Promise<ConverterResult> {
        switch (queueItem.dashboardItem.type) {
            case 'REPORTS':
                return await this.#convertReports(queueItem)
            case 'RESOURCES':
                return await this.#convertResources(queueItem)
            case 'TEXT':
                return await this.#convertText(queueItem)
            case 'APP':
            case 'MESSAGES':
            case 'USERS':
                return Promise.resolve({ html: '', css: '' })
            default:
                throw new ItemParserError(
                    `Parser not implemented for dashboard item type "${queueItem.dashboardItem.type}"`
                )
        }
    }

    async #convertText(queueItem: QueueItem) {
        const text = queueItem.dashboardItem.text

        if (!text) {
            throw new ItemParserError(
                'function `parseText` received a `dashboardItem` without a `text` string'
            )
        }

        const parser = new MdParser()

        const html =
            text === 'SPACER_ITEM_FOR_DASHBOARD_LAYOUT_CONVENIENCE'
                ? '<hr class="spacer"/>'
                : insertIntoTextTemplate(parser.render(text))

        return Promise.resolve({ html, css: '' })
    }

    // See https://github.com/dhis2/dashboard-app/blob/master/src/modules/itemTypes.js
    async #convertResources(queueItem: QueueItem) {
        const resources = queueItem?.dashboardItem?.resources

        if (!(Array.isArray(resources) && resources.length > 0)) {
            throw new ItemParserError(
                'function `parseResources` received a `dashboardItem` without any resources'
            )
        }

        const html = insertIntoAnchorListTemplate(
            // TODO: this is static non-localized text ¯\_(ツ)_/¯
            'Resources',
            resources.map(({ name, id }) => ({
                name,
                url: `${this.#baseUrl}/api/documents/${id}/data`,
            }))
        )

        return Promise.resolve({ html, css: '' })
    }

    async #convertReports(queueItem: QueueItem) {
        const reports = queueItem?.dashboardItem?.reports

        if (!(Array.isArray(reports) && reports.length > 0)) {
            throw new ItemParserError(
                'method `#convertReports` received a `dashboardItem` without any reports'
            )
        }

        const html = insertIntoAnchorListTemplate(
            // TODO: this is static non-localized text ¯\_(ツ)_/¯
            'Reports',
            reports.map(({ name, type, id }) => ({
                name,
                url: `${this.#baseUrl}/${this.#getReportPath(id, type)}`,
            }))
        )

        return Promise.resolve({ html, css: '' })
    }

    #getReportPath(id: string, type: ReportType) {
        switch (type) {
            case 'HTML':
                return `dhis-web-reports/#/standard-report/view/${id}`
            case 'JASPER_REPORT_TABLE':
            case 'JASPER_JDBC':
            default:
                return `api/reports/${id}/data.pdf?t=${new Date().getTime()}`
        }
    }
}
