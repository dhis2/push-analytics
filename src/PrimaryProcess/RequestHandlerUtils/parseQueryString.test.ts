import { RequestHandlerError } from './RequestHandlerError'
import { parseQueryString } from './parseQueryString'
import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('parseQueryString', () => {
    const baseUrl = 'http://www.example.com'

    it('should return the dashboardId and username if the URL is valid', () => {
        const dashboardId = 'gkhrgyD3Rd4'
        const username = 'test'
        const url = `/?dashboardId=${dashboardId}&username=${username}`

        assert.deepEqual(parseQueryString(url, baseUrl), { dashboardId, username })
    })
    it('should throw an error if the username is invalid or missing', () => {
        // Query param was omitted
        assert.throws(
            () => parseQueryString('/?dashboardId=gkhrgyD3Rd4', baseUrl),
            (error: unknown) => {
                assert(error instanceof RequestHandlerError)
                assert.strictEqual(error?.message, 'Invalid username "undefined"')
                return true
            }
        )

        // Query param empty
        assert.throws(
            () => parseQueryString('/?dashboardId=gkhrgyD3Rd4&username=', baseUrl),
            (error: unknown) => {
                assert(error instanceof RequestHandlerError)
                assert.strictEqual(error?.message, 'Invalid username ""')
                return true
            }
        )
    })
    it('should throw an error if the dashboardId is invalid or missing', () => {
        // Query param was omitted
        assert.throws(
            () => parseQueryString('/?username=test', baseUrl),
            (error: unknown) => {
                assert(error instanceof RequestHandlerError)
                assert.strictEqual(error?.message, 'Invalid dashhboard UID "undefined"')
                return true
            }
        )

        // Query param invalid
        const invalidId = 'INVALID_ID'
        assert.throws(
            () => parseQueryString(`/?dashboardId=${invalidId}&username=test`, baseUrl),
            (error: unknown) => {
                assert(error instanceof RequestHandlerError)
                assert.strictEqual(
                    error?.message,
                    `Invalid dashhboard UID "${invalidId}"`
                )
                return true
            }
        )
    })
})
