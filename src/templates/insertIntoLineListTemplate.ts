import { parseDashboardItemTemplate } from './parseTemplate'

const template = `
<div class="line-list">
    {{tableHtml}}
</div>
`

export const insertIntoLineListTemplate = (name: string, tableHtml: string) =>
    parseDashboardItemTemplate(template, { name, tableHtml })
