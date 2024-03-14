import type { PuppeteerLaunchOptions } from 'puppeteer'
import puppeteer from 'puppeteer'

export async function createPuppeteerBrowser(debug: boolean) {
    const defaultViewport = { width: 1280, height: 1000 }
    const browserOptions: PuppeteerLaunchOptions = debug
        ? {
              headless: false,
              devtools: true,
              defaultViewport,
              args: ['--window-size=2560,2160', '--window-position=4000,0'],
              /* Uncomment to add a delay between puppeteer steps
               * making it easier to visually debug problems */
              //   slowMo: 100,
          }
        : {
              headless: 'new',
              defaultViewport,
              //   Required argument for dockerized puppeteer
              //   args: ['--no-sandbox'],
          }
    const browser = await puppeteer.launch(browserOptions)
    return browser
}
