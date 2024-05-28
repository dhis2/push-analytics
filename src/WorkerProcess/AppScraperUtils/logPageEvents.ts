import type { Page } from 'puppeteer'

export function logPageEvents(page: Page) {
    page.on('console', async (message) => {
        if (message.text() != 'JSHandle@error') {
            console.log(
                `[BROWSER::CONSOLE::${message
                    .type()
                    .substring(0, 3)
                    .toUpperCase()}] ${message.text()}`
            )
            return
        }
        const messages = await Promise.all(
            message.args().map((arg) => {
                return arg.getProperty('message')
            })
        )

        console.log(
            `[BROWSER::CONSOLE::${message
                .type()
                .substring(0, 3)
                .toUpperCase()}] ${messages.filter(Boolean).join(' ')}`
        )
    })
        .on('pageerror', ({ message }) => {
            console.log(`[BROWSER::PAGE_ERROR] ${message}`)
        })
        .on('response', (response) => {
            console.log(`[BROWSER::RESPONSE::${response.status()}] ${response.url()}`)
        })
        .on('requestfailed', (request) => {
            const message = '[BROWSER::REQUESTFAILED] '

            if (request === null) {
                console.log(message + 'unknown request failure')
            } else {
                console.log(
                    `${message} ${request?.failure?.()?.errorText} ${request.url()}`
                )
            }
        })
}
