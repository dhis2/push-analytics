import { ElementHandle } from 'puppeteer'
import type { PageWithRelativeNavigation } from '../types'
import { escapeXpathString } from './escapeXpathString'

export const clickHoverMenuItemWithText = async (
    text: string,
    page: PageWithRelativeNavigation
) => {
    const escapedText = escapeXpathString(text)
    // find `li > span` item with provided text
    const liHandles = await page.$x(
        `//li/span[contains(text(), ${escapedText})]`
    )

    if (liHandles.length === 1) {
        const liHandle = liHandles[0] as ElementHandle<Element>
        await liHandle.click()
    } else {
        if (liHandles.length === 0) {
            throw new Error(`Menu item with text "${text}" not found`)
        } else {
            throw new Error(
                `Encountered ${liHandles.length} menu items with text "${text}"`
            )
        }
    }
}
