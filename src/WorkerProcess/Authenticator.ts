import type { Browser, Page, Protocol } from 'puppeteer'
import type { PushAnalyticsEnvVariables } from '../types'
import type { DashboardItemConverter } from './DashboardItemConverter'

export class Authenticator {
    #env: PushAnalyticsEnvVariables
    #page: Page
    #converter: DashboardItemConverter
    #sessionCookie: Protocol.Network.Cookie | null
    #impersonatedUser: string | null

    private constructor(
        env: PushAnalyticsEnvVariables,
        page: Page,
        converter: DashboardItemConverter
    ) {
        this.#env = env
        this.#page = page
        this.#converter = converter
        this.#sessionCookie = null
        this.#impersonatedUser = null
    }

    static async create(
        env: PushAnalyticsEnvVariables,
        browser: Browser,
        converter: DashboardItemConverter
    ) {
        const [firstBlankPage] = await browser.pages()
        return new Authenticator(env, firstBlankPage, converter)
    }

    async establishNonExpiringAdminSession(): Promise<void> {
        try {
            await this.#loginViaForm()
            await this.#setSessionCookie()
            this.#preventSessionExpiry()
        } catch (error) {
            throw new Error('Admin user could not login to the DHIS2 Core instance')
        }
    }

    async #loginViaForm() {
        await this.#page.bringToFront()
        await this.#page.goto(
            `${this.#env.baseUrl}/dhis-web-commons/security/login.action`
        )
        await this.#page.type('#j_username', this.#env.adminUsername)
        await this.#page.type('#j_password', this.#env.adminPassword)
        await this.#page.click('#submit')
    }

    async impersonateUser(username: string) {
        // No need to take action if it is the same user as before
        if (this.#impersonatedUser === username) {
            return
        }

        // Only exit impersonation mode if already in it
        if (this.#impersonatedUser) {
            const exitImpersonateStatusCode = await this.doAuthenticatedRequestFromPage(
                '/impersonateExit',
                'POST'
            )
            if (exitImpersonateStatusCode !== 200) {
                throw new Error(
                    `Could not exit impersonation mode. Received response status code ${exitImpersonateStatusCode}`
                )
            }
        }

        // Skip impersonation for admin user only
        if (username !== this.#env.adminUsername) {
            const impersonateStatusCode = await this.doAuthenticatedRequestFromPage(
                `/impersonate?username=${username}`,
                'POST'
            )
            if (impersonateStatusCode !== 200) {
                throw new Error(
                    `Could not impersonate user. Received response status code ${impersonateStatusCode}`
                )
            }

            this.#impersonatedUser = username
        }
    }

    async doAuthenticatedRequestFromPage(
        url: string,
        method = 'GET',
        returnValueType: 'responseStatus' | 'responseBody' = 'responseStatus'
    ) {
        if (!this.#sessionCookie) {
            throw new Error('Cookie not found, cannot issue an authenticated request')
        }

        const options = {
            url,
            host: this.#env.baseUrl,
            cookie: {
                name: this.#sessionCookie.name,
                value: this.#sessionCookie.value,
            },
            method,
            returnValueType,
        }

        return await this.#page.evaluate((options) => {
            return fetch(options.url, {
                method: options.method,
                headers: {
                    Accept: '*/*',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8,nl;q=0.7',
                    Connection: 'keep-alive',
                    Cookie: `${options.cookie.name}=${options.cookie.value}`,
                    Host: options.host,
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-origin',
                    'x-requested-with': 'XMLHttpRequest',
                },
            })
                .then((response) =>
                    options.returnValueType === 'responseStatus'
                        ? response.status
                        : response.json()
                )
                .catch(() =>
                    options.returnValueType === 'responseStatus' ? 500 : { Error: true }
                )
        }, options)
    }

    async #preventSessionExpiry() {
        // Do a ping request 30 seconds before the session is due to expire
        const intervalInMs = (parseInt(this.#env.sessionTimeout) - 30) * 1000
        const intervalId = setInterval(async () => {
            /* Bringing the login page to the front could break the
             * dashboard item conversion process. And and the naturally
             * occuring network traffic during a conversion also makes it
             * redundant to fire another request from here. */
            if (this.#converter.isConverting()) {
                return
            }

            await this.#page.bringToFront()

            const url = `/api/${this.#env.apiVersion}/system/ping`
            const httpStatusCode = await this.doAuthenticatedRequestFromPage(url)

            if (httpStatusCode !== 200) {
                clearInterval(intervalId)
                this.establishNonExpiringAdminSession()
            }
        }, intervalInMs)
    }

    async #setSessionCookie() {
        const cookies = await this.#page.cookies()
        const sessionCookie = cookies.find(
            (cookie: Protocol.Network.Cookie) => cookie.name === 'JSESSIONID'
        )
        if (!sessionCookie) {
            throw new Error('Could not find session cookie')
        }

        this.#sessionCookie = sessionCookie
    }
}
