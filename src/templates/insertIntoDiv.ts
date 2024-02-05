import { parseDashboardItemTemplate } from './parseTemplate'

const template = '{{html}}'

export const insertIntoDiv = (html: string, name: string = '') =>
    parseDashboardItemTemplate(template, { name, html })
