import puppeteer, { GoToOptions, Page, PuppeteerLaunchOptions } from 'puppeteer'
import { login } from './login'

type Options = {
    baseUrl: string
    username: string
    password: string
    debug?: boolean
}

export type CustomPage = Page & {
    gotoPath: (path: string, options?: GoToOptions) => Promise<void>
}

export const createAuthenticatedBrowserPage = async ({
    baseUrl,
    username,
    password,
    debug = false,
}: Options): Promise<Page> => {
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

    const customPage: CustomPage = Object.assign(page, {
        gotoPath: async (path: string, options?: GoToOptions) => {
            await page.goto(`${baseUrl}/${path}`, options)
        },
    })

    await login({ page: customPage, username, password })

    return customPage
}
