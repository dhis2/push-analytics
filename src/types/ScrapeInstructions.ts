type Strategy =
    | 'navigateToUrl'
    | 'useUiElements'
    | 'scrapeDownloadPage'
    | 'interceptFileDownload'
    | 'screenShotImgOnDownloadPage'
    | 'interceptResponse'
    | 'noop'

export type StepKind =
    | 'goto'
    | 'waitForSelector'
    | 'waitForSelectorConditionally'
    | 'click'
export type Step = Partial<Record<StepKind, string>>
export type Steps = Step[]

export type SelectorCondition = {
    dashboardItemProperty: string
    value: string | string[]
    selector: string
}
export type SelectorConditions = Array<SelectorCondition>

export type TriggerDownloadInstructions = {
    strategy: Strategy
    steps: Steps
}

export type ConditionalTriggerDownloadInstructions = TriggerDownloadInstructions & {
    dashboardItemProperty: string
    value: string | string[]
}

export type DownloadInstructions = {
    strategy: Strategy
    htmlSelector?: string
    cssSelector?: string
    modifyDownloadUrl?: {
        searchValue: string
        replaceValue: string
    }
    urlGlob?: string
}

export type ConditionalDownloadInstructions = DownloadInstructions & {
    dashboardItemProperty: string
    value: string | string[]
}

export type ScrapeInstructions = {
    version: string
    appUrl: string
    showVisualization: {
        strategy: Strategy
        steps: Record<StepKind, string | SelectorConditions>[]
    }
    triggerDownload: TriggerDownloadInstructions
    triggerDownloadConditionally: ConditionalTriggerDownloadInstructions[]
    obtainDownloadArtifact: DownloadInstructions
    obtainDownloadArtifactConditionally: ConditionalDownloadInstructions[]
    clearVisualization: {
        strategy: Strategy
        steps: Steps
    }
}

/* Scrape instructions without any conditional configuration
 * `obtainDownloadArtifactConditionally` is redundant
 * `showVisualization` is overridden so it does not contain a conditional selector */
export type ParsedScrapeInstructions = Omit<
    ScrapeInstructions,
    | 'obtainDownloadArtifactConditionally'
    | 'triggerDownloadConditionally'
    | 'showVisualization'
> & {
    showVisualization: {
        strategy: Strategy
        steps: Steps
    }
}
