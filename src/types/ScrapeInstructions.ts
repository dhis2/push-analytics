type Strategy =
    | 'navigateToUrl'
    | 'useUiElements'
    | 'scrapeDownloadPage'
    | 'interceptFileDownload'
    | 'screenShotImgOnDownloadPage'

export type StepKind =
    | 'goto'
    | 'waitForSelector'
    | 'waitForSelectorConditionally'
    | 'click'

export type HtmlOutput = 'image' | 'table'

export type ConditionalSelector = Array<{
    dashboardItemProperty: string
    value: string
    selector: string
}>

export type Steps = Record<StepKind, string | ConditionalSelector>[]

export type DownloadInstructions = {
    strategy: Strategy
    HtmlOutput: HtmlOutput
    openerUrl?: string
    htmlSelector?: string
    cssSelector?: string
    modifyDownloadUrl?: {
        searchValue: string
        replaceValue: string
    }
}

type ConditionalDownloadInstructions = DownloadInstructions & {
    dashboardItemProperty: string
    value: string
}

export type ScrapeInstructions = {
    version: string
    appUrl: string
    showVisualization: {
        strategy: Strategy
        steps: Steps
    }
    triggerDownload: {
        strategy: Strategy
        steps: Steps
    }
    obtainDownloadArtifact: DownloadInstructions
    obtainDownloadArtifactConditionally: ConditionalDownloadInstructions[]
    clearVisualization: {
        strategy: Strategy
        steps: Steps
    }
}
