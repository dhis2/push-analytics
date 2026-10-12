import assert from 'node:assert'
import { describe, it } from 'node:test'
import { toStandaloneAppUrl } from './toStandaloneAppUrl'

describe('toStandaloneAppUrl', () => {
    const baseUrl = 'http://web:8080'

    it('should add index.html and redirect=false before a hash route', () => {
        assert.strictEqual(
            toStandaloneAppUrl(`${baseUrl}/dhis-web-data-visualizer/#/BktEbwJgoxI`),
            `${baseUrl}/dhis-web-data-visualizer/index.html?redirect=false#/BktEbwJgoxI`
        )
    })
    it('should keep the query string inside a hash route untouched', () => {
        assert.strictEqual(
            toStandaloneAppUrl(
                `${baseUrl}/dhis-web-maps/#/xIywMQ27ku3/download?isPushAnalytics=true`
            ),
            `${baseUrl}/dhis-web-maps/index.html?redirect=false#/xIywMQ27ku3/download?isPushAnalytics=true`
        )
    })
    it('should append redirect=false to an existing query string', () => {
        assert.strictEqual(
            toStandaloneAppUrl(`${baseUrl}/dhis-web-event-visualizer?id=WIxuUpm5m4U`),
            `${baseUrl}/dhis-web-event-visualizer/index.html?id=WIxuUpm5m4U&redirect=false`
        )
    })
    it('should handle app paths served from the apps API', () => {
        assert.strictEqual(
            toStandaloneAppUrl(`${baseUrl}/api/apps/line-listing/#/AFjkDs7acBh`),
            `${baseUrl}/api/apps/line-listing/index.html?redirect=false#/AFjkDs7acBh`
        )
    })
    it('should not duplicate index.html or redirect=false', () => {
        const standaloneUrl = `${baseUrl}/dhis-web-data-visualizer/index.html?redirect=false#/`

        assert.strictEqual(toStandaloneAppUrl(standaloneUrl), standaloneUrl)
    })
    it('should keep a context path on the base URL', () => {
        assert.strictEqual(
            toStandaloneAppUrl('https://example.org/dhis/dhis-web-data-visualizer/#/'),
            'https://example.org/dhis/dhis-web-data-visualizer/index.html?redirect=false#/'
        )
    })
})
