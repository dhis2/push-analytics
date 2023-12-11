import { Page } from 'puppeteer'

const LOGIN_PATH = '/dhis-web-commons/security/login.action'
const LOGOUT_PATH = '/dhis-web-commons-security/logout.action'

export class LoginPage {
    #page: Page
    #baseUrl: string

    constructor(page: Page, baseUrl: string) {
        this.#page = page
        this.#baseUrl = baseUrl
    }

    async login(username: string, password: string): Promise<void> {
        try {
            await this.#page.bringToFront()
            await this.#page.goto(this.#baseUrl + LOGIN_PATH)
            await this.#page.type('#j_username', username)
            await this.#page.type('#j_password', password)
            await this.#page.click('#submit')
        } catch (error) {
            throw new Error(
                'Pupetteer could not login to the DHIS2 Core instance'
            )
        }
    }

    async logout(): Promise<void> {
        try {
            await this.#page.goto(this.#baseUrl + LOGOUT_PATH)
        } catch (error) {
            throw new Error(
                'Pupetteer could not logout from the DHIS2 Core instance'
            )
        }
    }

    async changeUser(username: string, password: string): Promise<void> {
        await this.logout()
        await this.login(username, password)
    }
}
