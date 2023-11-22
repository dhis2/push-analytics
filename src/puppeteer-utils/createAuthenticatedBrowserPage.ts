import puppeteer, {
    Browser,
    GoToOptions,
    PuppeteerLaunchOptions,
} from 'puppeteer'
import { login } from './login'
import { PageWithRelativeNavigation } from '../types'
import { downloadPath } from '../utils'
import path from 'path'

type Options = {
    baseUrl: string
    username: string
    password: string
    debug?: boolean
}

export const createAuthenticatedBrowserPage = async ({
    baseUrl,
    username,
    password,
    debug,
}: Options): Promise<{
    page: PageWithRelativeNavigation
    browser: Browser
}> => {
    const defaultViewport = { width: 1280, height: 1000 }
    const browserOptions: PuppeteerLaunchOptions = debug
        ? {
              headless: false,
              devtools: true,
              defaultViewport,
              args: ['--window-size=2560,2160', '--window-position=4000,0'],
              slowMo: 100,
          }
        : {
              headless: 'new',
              defaultViewport,
          }
    const browser = await puppeteer.launch(browserOptions)
    const page = await browser.newPage()
    const cdpSession = await page.target().createCDPSession()
    cdpSession.send('Browser.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath,
    })

    const pageWithRelativeNavigation: PageWithRelativeNavigation =
        Object.assign(page, {
            gotoPath: async (path: string, options?: GoToOptions) => {
                await page.goto(`${baseUrl}/${path}`, options)
            },
            setDownloadPathToItemId: (id: string): string => {
                const resolvedPath = path.join(downloadPath, id)
                cdpSession.send('Browser.setDownloadBehavior', {
                    behavior: 'allow',
                    downloadPath: resolvedPath,
                })
                return resolvedPath
            },
            getDhis2BaseUrl: (): string => baseUrl,
        })

    await login({ page: pageWithRelativeNavigation, username, password })

    if (debug) {
        // Show browser log messages in the terminal in debug mode
        page.on('console', (msg) => {
            for (let i = 0; i < msg.args().length; ++i)
                console.log(`${i}: ${msg.args()[i]}`)
        })
    }

    return { page: pageWithRelativeNavigation, browser }
}
