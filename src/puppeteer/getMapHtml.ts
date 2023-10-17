import { Browser } from 'puppeteer'

type Options = {
    browser: Browser
    baseUrl: string
    dashboardItem: DashboardItem
}

export const getMapHtml = async ({
    browser,
    baseUrl,
    dashboardItem,
}: Options) => {
    if (!dashboardItem.map) {
        throw new Error(
            'function `getMapHtml` received a `dashboardItem` without a `map` object'
        )
    }
    console.log(dashboardItem.map.name)
    const page = await browser.newPage()
    await page.goto(`${baseUrl}/dhis-web-maps/?id=${dashboardItem.map.id}`)
    await page.waitForSelector('canvas', { visible: true })
    await page.screenshot({ path: `images/map-${dashboardItem.map.id}.png` })

    // const [downloadMenuButton] = await page.$x(
    //     "//button[contains(., 'Download')]"
    // )
    // await downloadMenuButton.click()
    // const [downloadActionButton] = await page.$x(
    //     "//button[contains(., 'Download')]"
    // )
    // await downloadActionButton.click()

    console.log('visit')

    return 'This is map'
}
