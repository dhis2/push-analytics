import { PushAnalyticsError } from '../Error'
import type {
    ConditionalDownloadInstructions,
    ConditionalTriggerDownloadInstructions,
    DashboardItem,
    DashboardItemType,
    DownloadInstructions,
    ParsedScrapeInstructions,
    ScrapeInstructions,
    SelectorCondition,
    SelectorConditions,
    Step,
    Steps,
    TriggerDownloadInstructions,
} from '../types'
import { getDashboardItemVisualization, getNestedPropertyValue } from './AppScraperUtils'
import type { Authenticator } from './Authenticator'
import { parseTemplate } from './htmlTemplates'

/* TODO: in the future type 'APP' should also be supported
 * But before we can do this we need a way to identify the correct URL
 * for an app */
const APP_PATH_LOOKUP: Record<DashboardItemType, string | undefined> = {
    APP: undefined,
    EVENT_CHART: 'dhis-web-event-visualizer',
    EVENT_REPORT: 'dhis-web-event-reports',
    EVENT_VISUALIZATION: 'api/apps/line-listing',
    MAP: 'dhis-web-maps',
    MESSAGES: undefined,
    REPORTS: undefined,
    RESOURCES: undefined,
    TEXT: undefined,
    USERS: undefined,
    VISUALIZATION: 'dhis-web-data-visualizer',
}

class ScrapeConfigCacheError extends PushAnalyticsError {
    constructor(
        message: string,
        errorCode: string = 'E2601',
        httpResponseStatusCode: number = 500
    ) {
        super(message, errorCode, httpResponseStatusCode)
    }
}

type ErrorResponseBody = {
    httpStatus: string
    httpStatusCode: number
    status: string
    message: string
    appUrl: string
}

export interface IScrapeConfigCache {
    getScrapeConfig: (dashboardItem: DashboardItem) => Promise<ParsedScrapeInstructions>
}

export class ScrapeConfigCache implements IScrapeConfigCache {
    #baseUrl: string
    #cachedConfigs: Map<string, ScrapeInstructions>
    #authenticator

    constructor(baseUrl: string, authenticator: Authenticator) {
        this.#baseUrl = baseUrl
        this.#cachedConfigs = new Map()
        this.#authenticator = authenticator
    }

    public async getScrapeConfig(
        dashboardItem: DashboardItem
    ): Promise<ParsedScrapeInstructions> {
        const appPath = APP_PATH_LOOKUP[dashboardItem.type]

        if (!appPath) {
            throw new ScrapeConfigCacheError(
                `Could not find app to scrape for dahsboard item type "${dashboardItem.type}"`
            )
        }

        const scrapeConfig =
            this.#cachedConfigs.get(appPath) ??
            (await this.#fetchJsonInstructions(appPath))

        if (!scrapeConfig) {
            throw new ScrapeConfigCacheError(
                `Could not get config for dashboard-item-type "${dashboardItem.type}"`
            )
        }
        const parsedConfig = this.#parse(scrapeConfig, dashboardItem)
        return parsedConfig
    }

    async #fetchJsonInstructions(appPath: string) {
        const appUrl = `${this.#baseUrl}/${appPath}`
        const jsonFileUrl = `${appUrl}/push-analytics.json`

        try {
            const instructions: ScrapeInstructions | ErrorResponseBody =
                await this.#authenticator
                    .doAuthenticatedRequestFromPage(jsonFileUrl, 'GET', 'responseBody')
                    .then((response) => ({ ...response, appUrl }))

            if ('httpStatusCode' in instructions) {
                throw new ScrapeConfigCacheError(
                    `Could not fetch scrape instructions from "${appUrl}", httpStatusCode: "${instructions.httpStatusCode}" message "${instructions.message}"`
                )
            } else {
                this.#cachedConfigs.set(appPath, instructions)
                return instructions
            }
        } catch {
            throw new ScrapeConfigCacheError(
                `Could not fetch JSON scrape instructions from ${jsonFileUrl}`
            )
        }
    }

    // Resolve conditional parts of the config file for the current dashboardItem
    #parse(
        scrapeConfig: ScrapeInstructions,
        dashboardItem: DashboardItem
    ): ParsedScrapeInstructions {
        const visualization = getDashboardItemVisualization(dashboardItem)
        return {
            version: scrapeConfig.version,
            appUrl: scrapeConfig.appUrl,
            showVisualization: {
                strategy: scrapeConfig.showVisualization.strategy,
                steps: scrapeConfig.showVisualization.steps.map((step) => {
                    // Transform conditional step into unconditional
                    if (step.waitForSelectorConditionally) {
                        return this.#parseConditionalSelectorStep(
                            step.waitForSelectorConditionally as SelectorConditions,
                            dashboardItem
                        )
                    }

                    // Pupulate template with values for dashboardItem
                    if (step.goto && typeof step.goto === 'string') {
                        return {
                            goto: parseTemplate(step.goto, {
                                appUrl: scrapeConfig.appUrl,
                                id: visualization.id,
                            }),
                        }
                    }

                    return step
                }) as Steps,
            },
            triggerDownload:
                scrapeConfig.triggerDownload ??
                this.#parseConditionalTriggerInstructions(
                    scrapeConfig.triggerDownloadConditionally,
                    dashboardItem
                ),
            obtainDownloadArtifact:
                // Transform conditional download instructions into unconditional
                scrapeConfig.obtainDownloadArtifact ??
                this.#parseConditionalDownloadInstructions(
                    scrapeConfig.obtainDownloadArtifactConditionally,
                    dashboardItem
                ),
            clearVisualization: {
                strategy: scrapeConfig.clearVisualization.strategy,
                steps: scrapeConfig.clearVisualization.steps.map((step) =>
                    // Populate template with values for dashboardItem
                    step.goto && typeof step.goto === 'string'
                        ? {
                              goto: parseTemplate(step.goto, {
                                  appUrl: scrapeConfig.appUrl,
                              }),
                          }
                        : step
                ) as Steps,
            },
        }
    }

    #parseConditionalSelectorStep(
        conditions: SelectorConditions,
        dashboardItem: DashboardItem
    ): Pick<Step, 'waitForSelector'> {
        const condition = conditions.find((condition) =>
            this.#isConditionMatch(condition, dashboardItem)
        )

        if (!condition?.selector) {
            throw new ScrapeConfigCacheError(
                `Could identify conditional for selector dashboard item of type ${dashboardItem.type}`
            )
        }

        return { waitForSelector: condition?.selector }
    }

    #parseConditionalTriggerInstructions(
        conditions: ConditionalTriggerDownloadInstructions[],
        dashboardItem: DashboardItem
    ): TriggerDownloadInstructions {
        const condition = conditions.find((condition) =>
            this.#isConditionMatch(condition, dashboardItem)
        )

        if (!condition?.strategy) {
            throw new ScrapeConfigCacheError(
                `Could identify conditional trigger download instructions for dashboard item of type ${dashboardItem.type}`
            )
        }

        return {
            strategy: condition.strategy,
            steps: condition.steps,
        }
    }

    #parseConditionalDownloadInstructions(
        conditions: ConditionalDownloadInstructions[],
        dashboardItem: DashboardItem
    ): DownloadInstructions {
        const condition = conditions.find((condition) =>
            this.#isConditionMatch(condition, dashboardItem)
        )

        if (!condition?.strategy) {
            throw new ScrapeConfigCacheError(
                `Could identify conditional download instructions for dashboard item of type ${dashboardItem.type}`
            )
        }

        return {
            strategy: condition.strategy,
            htmlSelector: condition.htmlSelector,
            cssSelector: condition.cssSelector,
            modifyDownloadUrl: condition.modifyDownloadUrl,
            urlGlob: condition.urlGlob,
        }
    }

    #isConditionMatch(
        condition:
            | SelectorCondition
            | ConditionalDownloadInstructions
            | ConditionalTriggerDownloadInstructions,
        dashboardItem: DashboardItem
    ): boolean {
        const itemValue = getNestedPropertyValue(
            dashboardItem,
            condition.dashboardItemProperty
        )
        return Array.isArray(condition.value)
            ? condition.value.some((currValue) => currValue === itemValue)
            : condition.value === itemValue
    }
}
