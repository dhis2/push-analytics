import { URL } from 'node:url'
import { RequestHandlerError } from './RequestHandlerError'

const UID_REGEX = /^[a-zA-Z][a-zA-Z0-9]{10}$/
const URL_TEMPLATE_EXAMPLE =
    '<host>:<port>/?dashboardId={id}&username={username}&locale={locale}'

export function parseQueryString(url = '', baseUrl: string) {
    const { searchParams } = new URL(url, baseUrl)
    const queryParams = Object.fromEntries(searchParams)
    const { dashboardId, username, locale } = queryParams

    if (Object.keys(queryParams).length === 0) {
        throw new RequestHandlerError(
            `Request has no query parameters. Make sure the "keyHtmlPushAnalyticsUrl" system setting in DHIS2 Core is a URL template such as "${URL_TEMPLATE_EXAMPLE}", not only the host and port`,
            'E1502',
            400
        )
    }

    if (!UID_REGEX.test(dashboardId)) {
        throw new RequestHandlerError(
            `Invalid dashboard UID "${dashboardId}"`,
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
