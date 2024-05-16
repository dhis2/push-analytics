import { URL } from 'node:url'
import { RequestHandlerError } from './RequestHandlerError'

const UID_REGEX = /^[a-zA-Z][a-zA-Z0-9]{10}$/
const isValidUid = (id: string) => UID_REGEX.test(id)
const isNonEmptyString = (str: string) => typeof str === 'string' && str.length > 0

export function parseQueryString(url = '', baseUrl: string) {
    const { searchParams } = new URL(url, baseUrl)
    const { dashboardId, username, locale } = Object.fromEntries(searchParams)

    if (!isValidUid(dashboardId)) {
        throw new RequestHandlerError(
            `Invalid dashhboard UID "${dashboardId}"`,
            'E1502',
            400
        )
    }

    if (!isNonEmptyString(username)) {
        throw new RequestHandlerError(`Invalid username "${username}"`, 'E1502', 400)
    }

    if (!isNonEmptyString(locale)) {
        throw new RequestHandlerError(`Invalid locale "${locale}"`, 'E1502', 400)
    }

    return { dashboardId, username, locale }
}
