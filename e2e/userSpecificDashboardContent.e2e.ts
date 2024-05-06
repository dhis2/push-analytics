import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert'
import { describe, test } from 'node:test'
import request from 'supertest'

/* Before writing the HTML strings to the fixtures files
 * `.replace(/\s+/g, '')` was applied to the string to remove
 * all newlines and whitespaces. The same is done again before
 * comparing the produced HTML string with the fixture. This
 * is done to avoid mismatches on newlines etc, but
 * why this is needed is beyond me. */

const fixturesPath = path.resolve('./e2e/__fixtures__')

describe('producing user specific dashboard content', () => {
    const req = request('http://localhost:1337')
    const dashboardId = 'KQVXh5tlzW2'
    const usernames = ['test_user_national', 'test_user_bo', 'test_user_bonthe']
    const htmlPerUser = new Map()

    for (const username of usernames) {
        test(`produces the expected HTML for username ${username}"`, (_, done) => {
            const filePath = path.resolve(fixturesPath, `${dashboardId}_${username}.txt`)
            const expectedHtml = fs.readFileSync(filePath).toString()

            req.get('/')
                .query({ dashboardId, username })
                .expect(200, (_, response) => {
                    const actualHtml = response.text.replace(/\s+/g, '')
                    htmlPerUser.set(username, actualHtml)
                    assert.strictEqual(actualHtml, expectedHtml)
                    done()
                })
        })
    }

    test('produces different HTML for each username', () => {
        assert.notEqual(htmlPerUser.get(usernames[0]), htmlPerUser.get(usernames[1]))
        assert.notEqual(htmlPerUser.get(usernames[0]), htmlPerUser.get(usernames[2]))
        assert.notEqual(htmlPerUser.get(usernames[1]), htmlPerUser.get(usernames[2]))
    })
})
