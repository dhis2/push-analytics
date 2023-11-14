import { ElementHandle } from 'puppeteer'
import type { PageWithRelativeNavigation } from '../types'
import { escapeXpathString } from './escapeXpathString'

type Options = {
    xpath?: string
    text?: string
    page: PageWithRelativeNavigation
}

export const clickElementWithText = async ({
    xpath = 'button',
    text = 'Download',
    page,
}: Options) => {
    const escapedText = escapeXpathString(text)
    const elHandles = await page.$x(
        `//${xpath}[contains(text(), ${escapedText})]`
    )

    if (elHandles.length === 1) {
        const elHandle = elHandles[0] as ElementHandle<Element>
        await elHandle.click()
    } else {
        if (elHandles.length === 0) {
            throw new Error(
                `Element with xpath "${xpath}" and text "${text}" not found`
            )
        } else {
            throw new Error(
                `Encountered ${elHandles.length} menu items with xpath "${xpath}" and text "${text}"`
            )
        }
    }
}
