import assert from 'node:assert'
import { describe, it } from 'node:test'
import { RequestHandlerError } from './RequestHandlerError'
import { parseQueryString } from './parseQueryString'

describe('parseQueryString', () => {
    const baseUrl = 'http://www.example.com'

    it('should return the dashboardId and username if the URL is valid', () => {
        const dashboardId = 'gkhrgyD3Rd4'
        const username = 'test'
        const locale = 'no'
        const url = `/?dashboardId=${dashboardId}&username=${username}&locale=${locale}`

        assert.deepEqual(parseQueryString(url, baseUrl), {
            dashboardId,
            username,
            locale,
        })
    })
    it('should throw an error if the username parameter is invalid or omitted', () => {
        // Query param was omitted
        assert.throws(
            () => parseQueryString('/?dashboardId=gkhrgyD3Rd4&locale=no', baseUrl),
            (error: unknown) => {
                assert(error instanceof RequestHandlerError)
                assert.strictEqual(error?.message, 'Invalid username "undefined"')
                return true
            }
        )

        // Query param empty
        assert.throws(
            () =>
                parseQueryString(
                    '/?dashboardId=gkhrgyD3Rd4&username=&locale=no',
                    baseUrl
                ),
            (error: unknown) => {
                assert(error instanceof RequestHandlerError)
                assert.strictEqual(error?.message, 'Invalid username ""')
                return true
            }
        )
    })
    it('should throw an error if the dashboardId parameter is invalid or omitted', () => {
        // Query param was omitted
        assert.throws(
            () => parseQueryString('/?username=test&locale=no', baseUrl),
            (error: unknown) => {
                assert(error instanceof RequestHandlerError)
                assert.strictEqual(error?.message, 'Invalid dashboard UID "undefined"')
                return true
            }
        )

        // Query param invalid
        const invalidId = 'INVALID_ID'
        assert.throws(
            () =>
                parseQueryString(
                    `/?dashboardId=${invalidId}&username=test&locale=no`,
                    baseUrl
                ),
            (error: unknown) => {
                assert(error instanceof RequestHandlerError)
                assert.strictEqual(error?.message, `Invalid dashboard UID "${invalidId}"`)
                return true
            }
        )
    })
    it('should throw an error if the locale parameter is omitted', () => {
        assert.throws(
            () => parseQueryString('/?dashboardId=gkhrgyD3Rd4&username=admin', baseUrl),
            (error: unknown) => {
                assert(error instanceof RequestHandlerError)
                assert.strictEqual(error?.message, 'Locale is missing')
                return true
            }
        )
    })
    it('should point to the URL template system setting if the request has no query parameters', () => {
        for (const url of ['', '/', '/?']) {
            assert.throws(
                () => parseQueryString(url, baseUrl),
                (error: unknown) => {
                    assert(error instanceof RequestHandlerError)
                    assert.strictEqual(
                        error?.message,
                        'Request has no query parameters. Make sure the "keyHtmlPushAnalyticsUrl" system setting in DHIS2 Core is a URL template such as "http://<host>:<port>/?dashboardId={id}&username={username}&locale={locale}", not only the host and port'
                    )
                    return true
                }
            )
        }
    })
    it('should return the default locale if the locale parameter is empty', () => {
        const dashboardId = 'gkhrgyD3Rd4'
        const username = 'test'
        const url = `/?dashboardId=${dashboardId}&username=${username}&locale=`

        assert.deepEqual(parseQueryString(url, baseUrl), {
            dashboardId,
            username,
            locale: 'en',
        })
    })
})
