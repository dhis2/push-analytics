import { parseDashboardItemTemplate } from './parseTemplate'

const template =
    '<img class="visualization-image" src="data:image/png;base64,{{base64Str}}"></img>'

export const insertIntoImageTemplate = (base64Str: string, name: string = '') =>
    parseDashboardItemTemplate(template, { name, base64Str })
