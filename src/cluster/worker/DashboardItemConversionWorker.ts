import { App } from "./AppPage"


export class DashboardItemConversionWorker {
    #baseUrl: string
    #debug: boolean
    #eventChartsApp: App
    #eventReportsApp: App
    #lineListApp: App
    #mapsApp: App
    #dataVisualizerApp: App

    constructor(baseUrl: string, debug: boolean) {
        this.#baseUrl = baseUrl
        this.#debug = debug
        this.#eventChartsApp = new App()
        this.#eventReportsApp = new App()
        this.#lineListApp = new App()
        this.#mapsApp = new App()
        this.#dataVisualizerApp = new App()
    }

    async init() {
        #eventChartsApp: App
        #eventReportsApp: App
        #lineListApp: App
        #mapsApp: App
        #dataVisualizerApp: App
    }
}