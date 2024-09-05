import type { PuppeteerLaunchOptions } from 'puppeteer'
import puppeteer from 'puppeteer'

/* Notes about Chrome args:
 * `--no-sandbox` is needed to run headless chrome in docker
 * `--enable-gpu` is needed for WebGL in headless Chrome on Linux (so also Docker) */

export async function createPuppeteerBrowser(debug: boolean) {
    const defaultViewport = { width: 1280, height: 1000 }
    const browserOptions: PuppeteerLaunchOptions = debug
        ? {
              headless: false,
              devtools: true,
              defaultViewport,
              args: [
                  '--window-size=2560,2160',
                  '--window-position=4000,0',
                  '--no-sandbox',
                  '--enable-gpu',
              ],
              /* Uncomment to add a delay between puppeteer steps
               * making it easier to visually debug problems */
              //   slowMo: 100,
          }
        : {
              headless: true,
              defaultViewport,
              args: ['--no-sandbox', '--enable-gpu'],
          }
    const browser = await puppeteer.launch(browserOptions)
    return browser
}
