import { parseDashboardItemTemplate } from './parseTemplate'

const template = `
<div class="pivot-table">
    {{tableHtml}}
</div>
`

export const insertIntoPivotTableTemplate = (name: string, tableHtml: string) =>
    parseDashboardItemTemplate(template, { name, tableHtml })
