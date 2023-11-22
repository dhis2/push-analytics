import { parseDashboardItemTemplate } from './parseTemplate'

const template = `<img class="map" src="data:image/png;base64,{{base64Str}}"></img>`

export const insertIntoMapTemplate = (base64Str: string) =>
    parseDashboardItemTemplate(template, { base64Str })
