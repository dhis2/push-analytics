import type { QueueItem } from '../types'
import { parseDashboardItemTemplate } from './parseTemplate'

const template = `
<div class="conversion-error">
    <pre style="color: red;">{{error}}</pre>
    <pre>{{item}}</pre>
</div>
`

export const insertIntoConversionErrorTemplate = (
    queueItem: QueueItem,
    error: unknown
) =>
    parseDashboardItemTemplate(template, {
        name: 'Conversion Error',
        error: (error as Error).toString(),
        item: JSON.stringify(queueItem, null, 4),
    })
