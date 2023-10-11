import http from 'http'
import { computeBaseRequestOptions } from './computeBaseRequestOptions'
import { fieldsArrayToQueryParam } from './fieldsArrayToQueryParam'
import { doGetRequest } from './doGetRequest'
import puppeteer, { Browser } from 'puppeteer'

export class DashboardToEmailConverter {
    baseRequestOptions: http.RequestOptions
    browser: Browser | null

    constructor(options: DashboardToEmailConverterOptions) {
        this.baseRequestOptions = computeBaseRequestOptions(options)
        this.browser = null
    }

    async ensureBrowser() {
        if (this.browser) {
            return Promise.resolve(this.browser)
        } else {
            const browser = await puppeteer.launch()
            this.browser = browser
            return this.browser
        }
    }

    async convert(dashboardId: string) {
        await this.ensureBrowser()
        const { displayName, dashboardItems } = await this.getDashboard(
            dashboardId
        )
        const dashboardItemsHtml = await Promise.all(
            dashboardItems.map((dashboardItem) =>
                this.getDashboardItemHtml(dashboardItem)
            )
        ).then((htmlSnippets) =>
            htmlSnippets
                .map(
                    (html: string) =>
                        `<div class="dashboard-item">${html}</div>`
                )
                .join('\n')
        )

        return `<div class="container"><h1>${displayName}</h1><div class="item-wrapper">${dashboardItemsHtml}</div></div>`
    }

    async getDashboard(dashboardId: string) {
        const fieldsParam: string = fieldsArrayToQueryParam([
            'displayName',
            'itemCount',
            {
                name: 'dashboardItems',
                fields: [
                    'id',
                    'type',
                    { name: 'visualization', fields: ['id', 'name', 'type'] },
                ],
            },
        ])
        const path = `/dashboards/${dashboardId}?${fieldsParam}`
        const result = await this.get(path)
        return result as Dashboard
    }

    async get(relativePath: string) {
        const options = {
            ...this.baseRequestOptions,
            method: 'GET',
            path: this.baseRequestOptions.path + relativePath,
        }
        const result = await doGetRequest(relativePath, options)
        return result
    }

    async getDashboardItemHtml(dashboardItem: DashboardItem) {
        switch (dashboardItem.type) {
            case 'VISUALIZATION':
                return await Promise.resolve('VISUALIZATION')
            case 'EVENT_VISUALIZATION':
                return await Promise.resolve('EVENT_VISUALIZATION')
            case 'EVENT_CHART':
                return await Promise.resolve('EVENT_CHART')
            case 'MAP':
                return await Promise.resolve('MAP')
            case 'EVENT_REPORT':
                return await Promise.resolve('EVENT_REPORT')
            case 'USERS':
                return await Promise.resolve('USERS')
            case 'REPORTS':
                return await Promise.resolve('REPORTS')
            case 'RESOURCES':
                return await Promise.resolve('RESOURCES')
            case 'TEXT':
                return await Promise.resolve('TEXT')
            case 'MESSAGES':
                return await Promise.resolve('MESSAGES')
            case 'APP':
                return await Promise.resolve('APP')
            default:
                return Promise.resolve(
                    `<h6>Encountered an unsupported dashboard item type "${dashboardItem.type}"</h6>`
                )
        }
    }
}
