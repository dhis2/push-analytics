import { parseDashboardItemTemplate, parseTemplate } from './parseTemplate'

const listItemTemplate = `
<li class="resource-list-item">
    <a href={{url}} target="_blank">{{name}}</a>
</li>
`

const template = `
<ul class="resources-list">
    {{listItems}}
</ul>
`

export const insertIntoResourcesTemplate = (
    reports: { name: string; url: string }[]
) =>
    parseDashboardItemTemplate(template, {
        // TODO: this is static non-localized text
        name: 'Resources',
        listItems: reports
            .map((report) => parseTemplate(listItemTemplate, report))
            .join('\n'),
    })
