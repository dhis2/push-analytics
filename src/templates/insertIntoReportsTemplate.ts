import { parseDashboardItemTemplate, parseTemplate } from './parseTemplate'

const listItemTemplate = `
<li class="report-list-item">
    <a href={{url}} target="_blank">{{name}}</a>
</li>
`

const template = `
<ul class="reports-list">
    {{listItems}}
</ul>
`

export const insertIntoReportsTemplate = (
    reports: { name: string; url: string }[]
) =>
    parseDashboardItemTemplate(template, {
        // TODO: this is static non-localized text
        name: 'Reports',
        listItems: reports
            .map((report) => parseTemplate(listItemTemplate, report))
            .join('\n'),
    })
