import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert'
import { describe, test } from 'node:test'
import stringSimilarity from 'string-similarity'
import request from 'supertest'

const fixturesPath = path.resolve('./e2e/__fixtures__')

describe('producing user specific dashboard content', () => {
    if (!process.env.HOST || !process.env.PORT) {
        throw new Error('HOST and PORT env variables missing, aborting test run')
    }
    const url = `${process.env.HOST}:${process.env.PORT}`
    console.log(`Running tests agains URL "${url}"`)
    const req = request(url)
    const dashboardId = 'KQVXh5tlzW2'
    const usernameWithNorwegianLocale = 'test_user_national_nb'
    const usernames = [
        'test_user_national',
        // org unit data
        'test_user_bo',
        'test_user_bonthe',
        // locale
        usernameWithNorwegianLocale,
    ]
    const htmlPerUser: Map<string, string> = new Map()

    for (const username of usernames) {
        test(`produces the expected HTML for username ${username}"`, async () => {
            const locale = username === usernameWithNorwegianLocale ? 'no' : 'en'
            const filePath = path.resolve(fixturesPath, `${dashboardId}_${username}.txt`)
            const expectedHtml = fs.readFileSync(filePath).toString()
            const response = await req.get('/').query({ dashboardId, username, locale })

            console.log(response)

            assert.strictEqual(response.status, 200)

            // Strip whitespace and newlines to avoid
            const actualHtml = response.text
            // Enable line below to generate new fixtures
            // fs.writeFileSync(filePath, actualHtml)
            htmlPerUser.set(username, actualHtml)

            /* The e2e dashboard used to assert content customisation looks slightly different
             * depending on when it is viewed. As a result the HTML strings are not constant.
             * They are very similar each time though. For now the test only asserts that the
             * actual HTML and the expected HTML are 75% "similar". I expect this test to be good
             * enough to catch regressions, even though "being similar to a fixture" may not always
             * be equivalent to "generating the correct output". If in the furure it turns out that
             * we need more grnaular tests, we'll either have to write regex based tests or mount the
             * generated HTML to JS DOM, to assert the tables have expected content and the images
             * are showing.*/
            const similarity = stringSimilarity.compareTwoStrings(
                actualHtml,
                expectedHtml
            )
            console.log(`Actual and expected string are ${similarity * 100}% similar`)
            assert.strictEqual(similarity > 0.8, true)
        })
    }

    test('produces different HTML for each username', () => {
        assert.notEqual(htmlPerUser.get(usernames[0]), htmlPerUser.get(usernames[1]))
        assert.notEqual(htmlPerUser.get(usernames[0]), htmlPerUser.get(usernames[2]))
        assert.notEqual(htmlPerUser.get(usernames[1]), htmlPerUser.get(usernames[2]))
    })

    test('expected localised strings are found', () => {
        const localisedHtml = htmlPerUser.get(usernameWithNorwegianLocale)

        assert.strictEqual(localisedHtml?.includes('Norwegian dashboard name'), true)
        assert.strictEqual(localisedHtml?.includes('Norwegian viz name'), true)
    })
})
