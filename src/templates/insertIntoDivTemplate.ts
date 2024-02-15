import { parseDashboardItemTemplate } from './parseTemplate'

const template = '{{html}}'

export const insertIntoDivTemplate = (html: string, name: string = '') =>
    parseDashboardItemTemplate(template, { name, html })
