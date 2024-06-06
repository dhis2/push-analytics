import { parseTemplate } from './parseTemplate'

const template = '<!DOCTYPE html><html><head></head><body>{{html}}</body></html>'

export const insertIntoEmailTemplate = (html: string, css: string) =>
    parseTemplate(template, { css: css, html })
