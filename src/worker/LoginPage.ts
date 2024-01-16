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
            // await this.#page.bringToFront()
            // await this.#page.goto(this.#baseUrl + LOGIN_PATH)
            // await this.#page.type('#j_username', username)
            // await this.#page.type('#j_password', password)
            // await this.#page.click('#submit')
            const options = {
                loginUrl: this.#baseUrl + LOGIN_PATH,
                username: encodeURIComponent(username),
                password: encodeURIComponent(password),
            }
            console.log('Going to login', options)
            const loginResponse = await this.#page.evaluate((options) => {
                return fetch(options.loginUrl, {
                    method: 'POST',
                    body: `j_username=${options.username}&j_password=${options.password}`,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                })
                    .then((response) => response.json().then((r) => r))
                    .catch((err) => {
                        return err.message
                    })
            }, options)
            console.log('loginResponse: ', loginResponse)
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
