import { Page, Protocol } from 'puppeteer'

type AuthenticatorOptions = {
    page: Page
    baseUrl: string
    apiVersion: string
    adminUsername: string
    adminPassword: string
    sessionTimeout: string
    isConverting: () => boolean
}

export class Authenticator {
    #page: Page
    #baseUrl: string
    #apiVersion: string
    #adminUsername: string
    #adminPassword: string
    #sessionTimeout: string
    #isConverting: () => boolean
    #sessionCookie: Protocol.Network.Cookie | null
    #isImpersonatingUser: boolean

    constructor({
        page,
        baseUrl,
        apiVersion,
        adminUsername,
        adminPassword,
        sessionTimeout,
        isConverting,
    }: AuthenticatorOptions) {
        this.#page = page
        this.#baseUrl = baseUrl
        this.#apiVersion = apiVersion
        this.#adminUsername = adminUsername
        this.#adminPassword = adminPassword
        this.#sessionTimeout = sessionTimeout
        this.#isConverting = isConverting
        this.#sessionCookie = null
        this.#isImpersonatingUser = false
    }

    async establishNonExpiringAdminSession(): Promise<void> {
        try {
            await this.#page.bringToFront()
            await this.#page.goto(
                `${this.#baseUrl}/dhis-web-commons/security/login.action`
            )
            await this.#page.type('#j_username', this.#adminUsername)
            await this.#page.type('#j_password', this.#adminPassword)
            await this.#page.click('#submit')
            await this.#setSessionCookie()
            this.#preventSessionExpiry()
        } catch (error) {
            throw new Error(
                'Admin user could not login to the DHIS2 Core instance'
            )
        }
    }

    async impersonateUser(username: string) {
        if (this.#isImpersonatingUser) {
            const exitImpersonateStatusCode =
                await this.#doAuthenticatedGetRequestFromPage(
                    '/impersonateExit',
                    'POST'
                )
            if (exitImpersonateStatusCode !== 200) {
                throw new Error('Could not exit impersonation mode')
            }
        }
        const impersonateStatusCode =
            await this.#doAuthenticatedGetRequestFromPage(
                `/impersonate?username=${username}`,
                'POST'
            )
        if (impersonateStatusCode !== 200) {
            throw new Error('Could not impersonate user')
        } else {
            this.#isImpersonatingUser = true
            await this.#setSessionCookie()
        }
    }

    async #preventSessionExpiry() {
        // Do a ping request 30 seconds before the session is due to expire
        const intervalInMs = (parseInt(this.#sessionTimeout) - 30) * 1000
        const intervalId = setInterval(async () => {
            /* Bringing the login page to the front could break the
             * dashboard item conversion process. And and the naturally
             * occuring network traffic in a conversion also makes it
             * redundant to fire another request from here. */
            if (this.#isConverting()) {
                return
            }

            await this.#page.bringToFront()

            const url = `/api/${this.#apiVersion}/system/ping`
            const httpStatusCode =
                await this.#doAuthenticatedGetRequestFromPage(url)

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

    async #doAuthenticatedGetRequestFromPage(url: string, method = 'GET') {
        if (!this.#sessionCookie) {
            throw new Error(
                'Cookie not found, cannot issue an authenticated request'
            )
        }

        const options = {
            url,
            host: this.#baseUrl,
            cookie: {
                name: this.#sessionCookie.name,
                value: this.#sessionCookie.value,
            },
            method,
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
                .then((response) => response.status)
                .catch(() => 500)
        }, options)
    }
}
