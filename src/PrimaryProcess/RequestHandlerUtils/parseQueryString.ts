import { URL } from 'node:url'
import { RequestHandlerError } from './RequestHandlerError'

const UID_REGEX = /^[a-zA-Z][a-zA-Z0-9]{10}$/

export function parseQueryString(url = '', baseUrl: string) {
    const { searchParams } = new URL(url, baseUrl)
    console.log(searchParams)
    const { dashboardId, username, locale } = Object.fromEntries(searchParams)

    if (!UID_REGEX.test(dashboardId)) {
        throw new RequestHandlerError(
            `Invalid dashhboard UID "${dashboardId}"`,
            'E1502',
            400
        )
    }

    if (!(typeof username === 'string' && username.length > 0)) {
        throw new RequestHandlerError(`Invalid username "${username}"`, 'E1502', 400)
    }

    /* As discussed with DHIS2 Core backend devs, the locale could end up being empty
     * on a misconfigured instance: if a user is using the default `dbLocale` and
     * the instance doesn't have a default `dbLocale` specified in system settings.
     * For these cases push analytics should default to `en` as a "best guess". But
     * we do want to ensure that a valid `keyHtmlPushAnalyticsUrl`, including the
     * locale query param. So the `locale` may be empty but it may not be omitted. */
    if (typeof locale !== 'string') {
        throw new RequestHandlerError(`Locale is missing`, 'E1502', 400)
    }

    return { dashboardId, username, locale: locale || 'en' }
}
