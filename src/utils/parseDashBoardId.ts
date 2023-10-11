import { HttpResponseStatusError } from './HttpResponseStatusError'

const UID_REGEX = /\/[a-zA-Z0-9]{11}/
export const parseDashBoardId = (url = '') => {
    if (UID_REGEX.test(url)) {
        return url.slice(1)
    } else {
        throw new HttpResponseStatusError('Invalid dashhboard UID', 400)
    }
}
