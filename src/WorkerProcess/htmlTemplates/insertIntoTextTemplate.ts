import { parseDashboardItemTemplate } from './parseTemplate'

const template = '<div class="text">{{html}}</div>'

export const insertIntoTextTemplate = (html: string) =>
    parseDashboardItemTemplate(template, { html })
