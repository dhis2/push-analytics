import MdParser from '@dhis2/d2-ui-rich-text/parser/MdParser'
import {
    insertIntoAnchorListTemplate,
    insertIntoTextTemplate,
} from '../templates'
import type {
    Converter,
    ConverterResult,
    QueueItem,
    ReportType,
} from '../types'
import { createTimer } from '../utils'

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
                throw new Error(
                    `Parser not implemented for dashboard item type "${queueItem.dashboardItem.type}"`
                )
        }
    }

    async #convertText(queueItem: QueueItem) {
        const text = queueItem.dashboardItem.text

        if (!text) {
            throw new Error(
                'function `parseText` received a `dashboardItem` without a `text` string'
            )
        }

        const timer = createTimer()
        const parser = new MdParser()

        const html =
            text === 'SPACER_ITEM_FOR_DASHBOARD_LAYOUT_CONVENIENCE'
                ? '<hr class="spacer"/>'
                : insertIntoTextTemplate(parser.render(text))

        console.log(`Converted text item in ${timer.getElapsedTime()} sec`)

        return Promise.resolve({ html, css: '' })
    }

    // See https://github.com/dhis2/dashboard-app/blob/master/src/modules/itemTypes.js
    async #convertResources(queueItem: QueueItem) {
        const resources = queueItem?.dashboardItem?.resources

        if (!(Array.isArray(resources) && resources.length > 0)) {
            throw new Error(
                'function `parseResources` received a `dashboardItem` without any resources'
            )
        }

        const timer = createTimer()

        const html = insertIntoAnchorListTemplate(
            // TODO: this is static non-localized text ¯\_(ツ)_/¯
            'Resources',
            resources.map(({ name, id }) => ({
                name,
                url: `${this.#baseUrl}/api/documents/${id}/data`,
            }))
        )

        console.log(`Converted resources list in ${timer.getElapsedTime()} sec`)

        return Promise.resolve({ html, css: '' })
    }

    async #convertReports(queueItem: QueueItem) {
        const reports = queueItem?.dashboardItem?.reports

        if (!(Array.isArray(reports) && reports.length > 0)) {
            throw new Error(
                'method `#convertReports` received a `dashboardItem` without any reports'
            )
        }

        const timer = createTimer()

        const html = insertIntoAnchorListTemplate(
            // TODO: this is static non-localized text ¯\_(ツ)_/¯
            'Reports',
            reports.map(({ name, type, id }) => ({
                name,
                url: `${this.#baseUrl}/${this.#getReportPath(id, type)}`,
            }))
        )

        console.log(`Converted reports list in ${timer.getElapsedTime()} sec`)

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