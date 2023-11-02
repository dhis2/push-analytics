import { insertIntoResourcesTemplate } from '../templates'
import { ConverterFn } from '../types'
import { createTimer } from '../utils'

// See https://github.com/dhis2/dashboard-app/blob/master/src/modules/itemTypes.js

export const parseResources: ConverterFn = (dashboardItem, page) => {
    const resources = dashboardItem?.resources

    if (!resources || (Array.isArray(resources) && resources.length === 0)) {
        throw new Error(
            'function `parseResources` received a `dashboardItem` without any resources'
        )
    }

    const timer = createTimer()
    const baseUrl = page.getDhis2BaseUrl()

    const html = insertIntoResourcesTemplate(
        resources.map(({ name, id }) => ({
            name,
            url: `${baseUrl}/api/documents/${id}/data`,
        }))
    )

    console.log(`Converted resources list in ${timer.getElapsedTime()} sec`)

    return Promise.resolve(html)
}
