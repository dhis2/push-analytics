import MdParser from '@dhis2/d2-ui-rich-text/parser/MdParser'
import { ConverterFn } from '../types'
import { insertIntoTextTemplate } from '../templates/insertIntoTextTemplate'
import { createTimer } from '../utils'

export const parseText: ConverterFn = (dashboardItem) => {
    if (!dashboardItem.text) {
        throw new Error(
            'function `parseText` received a `dashboardItem` without a `text` string'
        )
    }

    const timer = createTimer()
    const parser = new MdParser()

    const html =
        dashboardItem.text === 'SPACER_ITEM_FOR_DASHBOARD_LAYOUT_CONVENIENCE'
            ? '<hr class="spacer"/>'
            : insertIntoTextTemplate(parser.render(dashboardItem.text))

    console.log(`Converted text item in ${timer.getElapsedTime()} sec`)

    return Promise.resolve(html)
}
