import { insertIntoDashboardHeaderTemplate } from './templates'
import { ConverterResult, DashboardItem } from './types'

type Options = {
    dashboardItems: DashboardItem[]
    htmlSnippets: Record<string, ConverterResult>
    baseUrl: string
    dashboardId: string
    displayName: string
}

export const mergeDashboardItemHtmlAndCss = ({
    dashboardItems,
    htmlSnippets,
    baseUrl,
    dashboardId,
    displayName,
}: Options) =>
    dashboardItems
        .sort(
            (itemA, itemB) =>
                (itemA.y ?? 0) - (itemB.y ?? 0) ||
                (itemA.x ?? 0) - (itemB.x ?? 0)
        )
        .reduce(
            (acc, { id }) => {
                const htmlSnippet = htmlSnippets[id]

                if (!htmlSnippet || typeof htmlSnippet === 'string') {
                    acc.html += htmlSnippet ?? ''
                } else {
                    acc.html += htmlSnippet.html ?? ''
                    if (htmlSnippet.css && !acc.css.includes(htmlSnippet.css)) {
                        acc.css += htmlSnippet.css
                    }
                }
                return acc
            },
            {
                html: insertIntoDashboardHeaderTemplate(
                    baseUrl,
                    dashboardId,
                    displayName
                ),
                css: '',
            }
        )
