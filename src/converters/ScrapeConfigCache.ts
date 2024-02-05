import { DashboardItem, DashboardItemType, ScrapeInstructions } from '../types'
import dataVisualizerInstructions from '../dummy-instructions/data-visualizer-app.json'
import eventChartsInstructions from '../dummy-instructions/event-charts-app.json'
import eventReportsInstructions from '../dummy-instructions/event-reports-app.json'
import lineListingInstructions from '../dummy-instructions/line-listing-app.json'

/* TODO: in the future type 'APP' should also be supported
 * But before we can do this we need a way to identify the correct URL
 * for an app */
const APP_PATH_LOOKUP: Record<DashboardItemType, string | undefined> = {
    APP: undefined,
    EVENT_CHART: 'dhis-web-event-visualizer',
    EVENT_REPORT: 'dhis-web-event-reports',
    EVENT_VISUALIZATION: 'api/apps/line-listing',
    // TODO: convert maps app for scraping
    // MAP: 'dhis-web-maps',
    MAP: undefined,
    MESSAGES: undefined,
    REPORTS: undefined,
    RESOURCES: undefined,
    TEXT: undefined,
    USERS: undefined,
    VISUALIZATION: 'dhis-web-data-visualizer',
}

export class ScrapeConfigCache {
    #baseUrl: string
    #cachedConfigs: Map<string, ScrapeInstructions>

    constructor(baseUrl: string) {
        this.#baseUrl = baseUrl
        this.#cachedConfigs = new Map()
    }

    async getScrapeConfig(
        dashboardItem: DashboardItem
    ): Promise<ScrapeInstructions> {
        const appPath = APP_PATH_LOOKUP[dashboardItem.type]

        if (!appPath) {
            throw new Error(
                `Could not find app to scrape for dahsboard item type "${dashboardItem.type}"`
            )
        }

        // TODO: switch to this method once JSON files have been migrated
        const scrapeConfig =
            this.#cachedConfigs.get(appPath) ??
            (await this.#addLocalInstructions(appPath))

        if (!scrapeConfig) {
            throw new Error(
                `Could not get config for dashboard-item-type "${dashboardItem.type}"`
            )
        }

        return scrapeConfig
    }

    async #addLocalInstructions(appPath: string) {
        const instructions = {
            appUrl: `${this.#baseUrl}/${appPath}`,
        } as ScrapeInstructions

        if (appPath === 'dhis-web-event-visualizer') {
            Object.assign(instructions, eventChartsInstructions)
        } else if (appPath === 'dhis-web-event-reports') {
            Object.assign(instructions, eventReportsInstructions)
        } else if (appPath === 'api/apps/line-listing') {
            Object.assign(instructions, lineListingInstructions)
        } else if (appPath === 'dhis-web-data-visualizer') {
            Object.assign(instructions, dataVisualizerInstructions)
        }
        this.#cachedConfigs.set(appPath, instructions)

        return Promise.resolve(instructions)
    }

    // async #fetchJsonInstructions(appPath: string) {
    //     const appUrl = `${this.#baseUrl}/${appPath}`
    //     const jsonFileUrl = `${appUrl}/push-analytics.json`

    //     try {
    //         const instructions: ScrapeInstructions = await fetch(jsonFileUrl)
    //             .then((response) => response.json())
    //             .then((instructions) => ({ ...instructions, appUrl }))

    //         this.#cachedConfigs.set(appPath, instructions)
    //         return instructions
    //     } catch (error) {
    //         throw new Error(
    //             `Could not fetch JSON scrape instructions from ${jsonFileUrl}`
    //         )
    //     }
    // }
}
