import puppeteer, { GoToOptions, PuppeteerLaunchOptions } from 'puppeteer'
import { login } from './login'
import { PageWithRelativeNavigation } from '../types/Puppeteer'

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
    debug = false,
}: Options): Promise<PageWithRelativeNavigation> => {
    const browserOptions: PuppeteerLaunchOptions = debug
        ? {
              headless: false,
              devtools: true,
              defaultViewport: { width: 1280, height: 1000 },
              args: ['--window-size=2560,2160', '--window-position=4000,0'],
          }
        : {
              headless: 'new',
          }
    const browser = await puppeteer.launch(browserOptions)
    const page = await browser.newPage()

    const pageWithRelativeNavigation: PageWithRelativeNavigation =
        Object.assign(page, {
            gotoPath: async (path: string, options?: GoToOptions) => {
                await page.goto(`${baseUrl}/${path}`, options)
            },
        })

    await login({ page: pageWithRelativeNavigation, username, password })

    return pageWithRelativeNavigation
}
