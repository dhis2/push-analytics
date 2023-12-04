// import { parse } from 'node:querystring'
import { HttpResponseStatusError } from '../httpGetClient'

const UID_REGEX = /[a-zA-Z0-9]{11}/
const isValidUid = (id: string) => UID_REGEX.test(id)
const isNonEmptyString = (str: string) =>
    typeof str === 'string' && str.length > 0

export const parseQueryString = (url = '', baseUrl: string) => {
    const { searchParams } = new URL(url, baseUrl)
    const { dashboardId, username, password } = Object.fromEntries(searchParams)

    if (!isValidUid(dashboardId)) {
        throw new HttpResponseStatusError('Invalid dashhboard UID', 400)
    }

    if (!isNonEmptyString(username)) {
        throw new HttpResponseStatusError('Invalid username', 400)
    }

    if (!isNonEmptyString(password)) {
        throw new HttpResponseStatusError('Invalid password', 400)
    }

    return { dashboardId, username, password }
}
