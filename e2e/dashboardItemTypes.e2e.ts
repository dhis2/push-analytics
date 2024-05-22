import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert'
import { describe, test } from 'node:test'
import stringSimilarity from 'string-similarity'
import request from 'supertest'

const fixturesPath = path.resolve('./e2e/__fixtures__')

describe('converting all types of dashboard items', () => {
    if (!process.env.HOST || !process.env.PORT) {
        throw new Error('HOST and PORT env variables missing, aborting test run')
    }
    const url = `${process.env.HOST}:${process.env.PORT}`

    console.log(`Running tests agains URL "${url}"`)

    test(`produces the expected HTML for a dashboard with all dashboard item types`, async () => {
        const req = request(url)
        const dashboardId = 'pf1FL0djQIl'
        const username = 'admin'
        const locale = 'en'
        const filePath = path.resolve(fixturesPath, `${dashboardId}_${username}.txt`)
        const expectedHtml = fs.readFileSync(filePath).toString()
        const response = await req.get('/').query({ dashboardId, username, locale })

        assert.strictEqual(response.status, 200)

        const actualHtml = response.text
        // Enable line below to generate new fixtures
        fs.writeFileSync(filePath, actualHtml)

        /* The e2e dashboard used to assert content customisation looks slightly different
         * depending on when it is viewed. As a result the HTML strings are not constant.
         * They are very similar each time though. For now the test only asserts that the
         * actual HTML and the expected HTML are 75% "similar". I expect this test to be good
         * enough to catch regressions, even though "being similar to a fixture" may not always
         * be equivalent to "generating the correct output". If in the furure it turns out that
         * we need more grnaular tests, we'll either have to write regex based tests or mount the
         * generated HTML to JS DOM, to assert the tables have expected content and the images
         * are showing.*/
        const similarity = stringSimilarity.compareTwoStrings(actualHtml, expectedHtml)
        assert.strictEqual(similarity > 0.75, true)
    })
})
