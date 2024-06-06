import { parseDashboardItemTemplate, parseTemplate } from './parseTemplate'

const listItemTemplate =
    '<li class="list-item"><a href={{url}} target="_blank">{{name}}</a></li>'

const template = '<ul class="list">{{listItems}}</ul>'

export const insertIntoAnchorListTemplate = (
    name: string,
    listItems: { name: string; url: string }[]
) =>
    parseDashboardItemTemplate(template, {
        name,
        listItems: listItems
            .map((listItem) => parseTemplate(listItemTemplate, listItem))
            .join(''),
    })
