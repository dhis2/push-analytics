// import { parse } from 'node:querystring'
import { HttpResponseStatusError } from '../../types'

const UID_REGEX = /^[a-zA-Z][a-zA-Z0-9]{10}$/
const isValidUid = (id: string) => UID_REGEX.test(id)
const isNonEmptyString = (str: string) => typeof str === 'string' && str.length > 0

export function parseQueryString(url = '', baseUrl: string) {
    const { searchParams } = new URL(url, baseUrl)
    const { dashboardId, username } = Object.fromEntries(searchParams)

    if (!isValidUid(dashboardId)) {
        throw new HttpResponseStatusError(`Invalid dashhboard UID ${dashboardId}`, 400)
    }

    if (!isNonEmptyString(username)) {
        throw new HttpResponseStatusError(`Invalid username ${username}`, 400)
    }

    return { dashboardId, username }
}
