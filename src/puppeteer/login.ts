import { Page } from 'puppeteer'

type Options = {
    page: Page
    baseUrl: string
    username: string
    password: string
}

const LOGIN_PATH = 'dhis-web-commons/security/login.action'

export const login = async ({ page, baseUrl, username, password }: Options) => {
    try {
        await page.goto(`${baseUrl}/${LOGIN_PATH}`)
        await page.type('#j_username', username)
        await page.type('#j_password', password)
        await page.click('#submit')
    } catch (error) {
        throw new Error('Pupetteer could not login to the DHIS2 Core instance')
    }
}
