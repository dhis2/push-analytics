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
    #cookie: Protocol.Network.Cookie | null

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
        this.#cookie = null
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
            const cookies = await this.#page.cookies()
            this.#cookie =
                cookies.find(
                    (cookie: Protocol.Network.Cookie) =>
                        cookie.name === 'JSESSIONID'
                ) ?? null
            this.#preventSessionExpiry()
        } catch (error) {
            throw new Error(
                'Admin user could not login to the DHIS2 Core instance'
            )
        }
    }

    async impersonateUser(username: string) {
        await this.#doAuthenticatedGetRequestFromPage(
            `/impersonate?username=${username}`
        )
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

            const httpStatusCode =
                await this.#doAuthenticatedGetRequestFromPage('/system/ping')

            if (httpStatusCode !== 200) {
                clearInterval(intervalId)
                this.establishNonExpiringAdminSession()
            }
        }, intervalInMs)
    }

    async #doAuthenticatedGetRequestFromPage(
        resource: string,
        toJson: boolean = false
    ) {
        if (!this.#cookie) {
            throw new Error(
                'Cookie not found, cannot issue an authenticated request'
            )
        }

        const options = {
            url: `/api/${this.#apiVersion}${resource}`,
            host: this.#baseUrl,
            cookie: {
                name: this.#cookie.name,
                value: this.#cookie.value,
            },
            toJson,
        }

        const responseData = await this.#page.evaluate((options) => {
            return fetch(options.url, {
                method: 'GET',
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
                .then((response) => {
                    if (options.toJson) {
                        return response.json()
                    } else {
                        return response.status
                    }
                })
                .catch((error) => {
                    if (options.toJson) {
                        return { isError: true, message: error.message }
                    } else {
                        return 500
                    }
                })
        }, options)

        if (typeof responseData === 'object' && responseData.isError) {
            throw new Error(responseData.message)
        } else {
            return responseData
        }
    }
}
