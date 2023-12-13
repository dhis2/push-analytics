import { insertIntoResourcesTemplate } from '../templates'
import type { QueueItem } from '../types/ConverterCluster'
import { createTimer } from '../utils'
import { AnchorParser } from './base/AnchorParser'

export class ResourcesParser extends AnchorParser {
    // See https://github.com/dhis2/dashboard-app/blob/master/src/modules/itemTypes.js
    async convert(queueItem: QueueItem) {
        const resources = queueItem?.dashboardItem?.resources

        if (
            !resources ||
            (Array.isArray(resources) && resources.length === 0)
        ) {
            throw new Error(
                'function `parseResources` received a `dashboardItem` without any resources'
            )
        }

        const timer = createTimer()

        const html = insertIntoResourcesTemplate(
            resources.map(({ name, id }) => ({
                name,
                url: `${this.baseUrl}/api/documents/${id}/data`,
            }))
        )

        console.log(`Converted resources list in ${timer.getElapsedTime()} sec`)

        return Promise.resolve(html)
    }
}
