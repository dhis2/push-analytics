import {
    ConditionalDownloadInstructions,
    DashboardItem,
    DashboardItemType,
    DownloadInstructions,
    ParsedScrapeInstructions,
    ScrapeInstructions,
    SelectorCondition,
    SelectorConditions,
    Step,
    Steps,
} from '../types'
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
    ): Promise<ParsedScrapeInstructions> {
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

        return this.#parse(scrapeConfig, dashboardItem)
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

    // Resolve conditional parts of the config file for the current dashboardItem
    #parse(
        scrapeConfig: ScrapeInstructions,
        dashboardItem: DashboardItem
    ): ParsedScrapeInstructions {
        return {
            version: scrapeConfig.version,
            appUrl: scrapeConfig.appUrl,
            showVisualization: {
                strategy: scrapeConfig.showVisualization.strategy,
                steps: scrapeConfig.showVisualization.steps.map((step) =>
                    step.waitForSelectorConditionally
                        ? pickConditionalSelectorForDashboardItem(
                              step.waitForSelectorConditionally as SelectorConditions,
                              dashboardItem
                          )
                        : step
                ) as Steps,
            },
            triggerDownload: scrapeConfig.triggerDownload,
            obtainDownloadArtifact:
                scrapeConfig.obtainDownloadArtifact ??
                pickConditionalDownloadInstructionsForDashboardItem(
                    scrapeConfig.obtainDownloadArtifactConditionally,
                    dashboardItem
                ),
            clearVisualization: scrapeConfig.clearVisualization,
        }
    }
}

function pickConditionalSelectorForDashboardItem(
    conditions: SelectorConditions,
    dashboardItem: DashboardItem
): Pick<Step, 'waitForSelector'> {
    const condition = conditions.find((condition) =>
        isConditionForDashboardItem(condition, dashboardItem)
    )

    if (!condition?.selector) {
        throw new Error(
            `Could identify conditional for selector dashboard item of type ${dashboardItem.type}`
        )
    }

    return { waitForSelector: condition?.selector }
}

function pickConditionalDownloadInstructionsForDashboardItem(
    conditions: ConditionalDownloadInstructions[],
    dashboardItem: DashboardItem
): DownloadInstructions {
    const condition = conditions.find((condition) =>
        isConditionForDashboardItem(condition, dashboardItem)
    )

    if (!condition?.strategy) {
        throw new Error(
            `Could identify conditional download instructions for dashboard item of type ${dashboardItem.type}`
        )
    }

    return {
        strategy: condition.strategy,
        HtmlOutput: condition.HtmlOutput,
        openerUrl: condition.openerUrl,
        htmlSelector: condition.htmlSelector,
        cssSelector: condition.cssSelector,
        modifyDownloadUrl: condition.modifyDownloadUrl,
    }
}

function isConditionForDashboardItem(
    condition: SelectorCondition | ConditionalDownloadInstructions,
    dashboardItem: DashboardItem
): boolean {
    const itemValue = getNestedPropertyValue(
        dashboardItem,
        condition.dashboardItemProperty
    )
    return condition.value.includes(',') && typeof itemValue === 'string'
        ? condition.value.includes(itemValue)
        : condition.value === itemValue
}

function getNestedPropertyValue(obj: object, propertyPath: string) {
    const nestedValue = propertyPath
        .split('.')
        .reduce((val: object | string | number | boolean, key: string) => {
            /* Below is a small TypeScript hoop we had to jump through:
             * There is absolutely no way to guarrantee that (nested)
             * properties like 'visualization.type' actually exist on the
             * provided object. And since these are ultimately coming from
             * the JSON config files, which are meant to be generic, there is
             * no point creating types for this. So we have to explcitely
             * tell TS the provided string represents a valid object path
             * to avoid a compilation error. */
            try {
                val = val[key as keyof typeof val]
            } catch {
                throw new Error(
                    `Found invalid dashboard item property "${propertyPath}"`
                )
            }

            return val
        }, obj)

    if (typeof nestedValue === 'object') {
        throw new Error('Value found on property path was not a primitive')
    }

    return nestedValue as string | boolean | number
}
