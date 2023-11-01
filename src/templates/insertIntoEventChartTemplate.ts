import { parseDashboardItemTemplate } from './parseTemplate'

const template = `<img class="event-chart" src="data:image/png;base64,{{base64Str}}"></img>`

export const insertIntoEventChartTemplate = (name: string, base64Str: string) =>
    parseDashboardItemTemplate(template, { name, base64Str })
