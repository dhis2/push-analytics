import { ElementHandle } from 'puppeteer'
import type { PageWithRelativeNavigation } from '../types'

const escapeXpathString = (str: string) => {
    const splitedQuotes = str.replace(/'/g, `', "'", '`)
    return `concat('${splitedQuotes}', '')`
}

export const clickButtonWithText = async (
    text: string,
    page: PageWithRelativeNavigation
) => {
    const escapedText = escapeXpathString(text)
    const buttonHandles = await page.$x(
        `//button[contains(text(), ${escapedText})]`
    )

    if (buttonHandles.length === 1) {
        const buttonHandle = buttonHandles[0] as ElementHandle<Element>
        await buttonHandle.click()
    } else {
        if (buttonHandles.length === 0) {
            throw new Error(`Button not found: ${text}`)
        } else {
            throw new Error(
                `Encountered ${buttonHandles.length} buttons with text "${text}"`
            )
        }
    }
}
