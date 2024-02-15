import MdParser from '@dhis2/d2-ui-rich-text/parser/MdParser'
import { insertIntoTextTemplate } from '../templates'
import type { Converter, QueueItem } from '../types'
import { createTimer } from '../utils'

export class TextParser implements Converter<string> {
    async convert(queueItem: QueueItem) {
        const text = queueItem.dashboardItem.text

        if (!text) {
            throw new Error(
                'function `parseText` received a `dashboardItem` without a `text` string'
            )
        }

        const timer = createTimer()
        const parser = new MdParser()

        const html =
            text === 'SPACER_ITEM_FOR_DASHBOARD_LAYOUT_CONVENIENCE'
                ? '<hr class="spacer"/>'
                : insertIntoTextTemplate(parser.render(text))

        console.log(`Converted text item in ${timer.getElapsedTime()} sec`)

        return Promise.resolve(html)
    }
}
