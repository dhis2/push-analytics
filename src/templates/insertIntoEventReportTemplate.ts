import { parseDashboardItemTemplate } from './parseTemplate'

const template = `
<div class="event-report">
    {{tableHtml}}
</div>
`

export const insertIntoEventReportTemplate = (
    name: string,
    tableHtml: string
) => parseDashboardItemTemplate(template, { name, tableHtml })
