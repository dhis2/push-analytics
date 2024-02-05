type Strategy =
    | 'navigateToUrl'
    | 'useUiElements'
    | 'scrapeDownloadPage'
    | 'interceptFileDownload'
    | 'screenShotImgOnDownloadPage'

type Step =
    | 'goto'
    | 'waitForSelector'
    | 'waitForSelectorConditionally'
    | 'click'

export type HtmlOutput = 'image' | 'table'

    dashboardItemProperty: string
    value: string
    selector: string
}

type DownloadInstructions = {
    strategy: Strategy
    openerUrl?: string
    htmlSelector?: string
    template?: string
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
        steps: Record<Step, string | ConditionalSelector>[]
    }
    triggerDownload: {
        strategy: Strategy
        steps: Record<Step, string>[]
    }
    obtainDownloadArtifact: DownloadInstructions
    obtainDownloadArtifactConditionally: ConditionalDownloadInstructions[]
    clearVisualization: {
        strategy: Strategy
        steps: Record<Step, string>[]
    }
}
