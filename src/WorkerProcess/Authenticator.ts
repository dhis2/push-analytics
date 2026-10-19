import type { Browser, Cookie, Page } from 'puppeteer'
import { PushAnalyticsError } from '../Error'
import { debugLog } from '../debugLog'
import type { PushAnalyticsEnvVariables } from '../types'
import type { DashboardItemConverter } from './DashboardItemConverter'

class AuthenticationError extends PushAnalyticsError {
    constructor(
        message: string,
        errorCode: string = 'E2301',
        httpResponseStatusCode: number = 500
    ) {
        super(message, errorCode, httpResponseStatusCode)
    }
}

export interface IAuthenticator {
    establishNonExpiringAdminSession: () => void
    impersonateUser: (username: string) => Promise<void>
}

export class Authenticator implements IAuthenticator {
    readonly #env: PushAnalyticsEnvVariables
    readonly #page: Page
    readonly #converter: DashboardItemConverter
    #sessionCookie: Cookie | null
    #impersonatedUser: string | null

    protected constructor(
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

    public async establishNonExpiringAdminSession(): Promise<void> {
        try {
            await this.#loginViaApi()
            await this.#setSessionCookie()
            this.#preventSessionExpiry()
            debugLog(
                `Successfully logged in as push-analytics admin-user "${
                    this.#env.adminUsername
                }"`
            )
        } catch (error) {
            debugLog(error)
            throw new AuthenticationError(
                'Admin user could not login to the DHIS2 Core instance'
            )
        }
    }

    public async impersonateUser(username: string): Promise<void> {
        // No need to take action if it is the same user as before
        if (this.#impersonatedUser === username) {
            return
        }

        // Only exit impersonation mode if already in it
        if (this.#impersonatedUser) {
            debugLog(`Exiting impersonation mode for user "${this.#impersonatedUser}"`)

            const exitImpersonateStatusCode = await this.doAuthenticatedRequestFromPage(
                '/api/auth/impersonateExit',
                'POST'
            )
            if (exitImpersonateStatusCode !== 200) {
                throw new AuthenticationError(
                    `Could not exit impersonation mode. Received response status code ${exitImpersonateStatusCode}`
                )
            }

            this.#impersonatedUser = null
        }

        // Skip impersonation for admin user only
        if (username !== this.#env.adminUsername) {
            debugLog(`Entering impersonation mode for user "${username}"`)

            const impersonateStatusCode = await this.doAuthenticatedRequestFromPage(
                `/api/auth/impersonate?username=${username}`,
                'POST'
            )
            if (impersonateStatusCode !== 200) {
                throw new AuthenticationError(
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
            throw new AuthenticationError(
                'Cookie not found, cannot issue an authenticated request'
            )
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

    async #loginViaApi() {
        await this.#page.bringToFront()
        // Open a lightweight unauthenticated page on the DHIS2 origin so the login fetch below is same-origin and its session cookie is stored in the browser
        await this.#page.goto(`${this.#env.baseUrl}/api/ping`)

        const loginStatus = await this.#page.evaluate(
            (credentials) =>
                fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(credentials),
                })
                    .then((response) => response.json())
                    .then((body) => body.loginStatus)
                    .catch(() => undefined),
            { username: this.#env.adminUsername, password: this.#env.adminPassword }
        )

        if (loginStatus !== 'SUCCESS') {
            throw new AuthenticationError(`Login failed with status "${loginStatus}"`)
        }
    }

    #preventSessionExpiry() {
        // Do a ping request 30 seconds before the session is due to expire
        const intervalInMs = (Number.parseInt(this.#env.sessionTimeout) - 30) * 1000
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
                await this.establishNonExpiringAdminSession()
            }
        }, intervalInMs)
    }

    async #setSessionCookie() {
        const cookies = await this.#page.cookies()
        const sessionCookie = cookies.find(
            (cookie: Cookie) => cookie.name === 'JSESSIONID'
        )
        if (!sessionCookie) {
            throw new AuthenticationError('Could not find session cookie')
        }

        this.#sessionCookie = sessionCookie
    }
}
