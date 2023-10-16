import puppeteer, { PuppeteerLaunchOptions } from 'puppeteer'

export const createBrowser = async (debug = false) => {
    const options: PuppeteerLaunchOptions = debug
        ? {
              headless: false,
              devtools: true,
              defaultViewport: { width: 1280, height: 1000 },
              args: ['--window-size=2560,2160', '--window-position=4000,0'],
          }
        : {
              headless: 'new',
          }
    return await puppeteer.launch(options)
}
