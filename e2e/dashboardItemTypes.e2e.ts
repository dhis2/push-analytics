import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert'
import { describe, test } from 'node:test'
import stringSimilarity from 'string-similarity'
import request from 'supertest'
import { assertEnv, getFixtureDir } from './utils'

describe('converting all types of dashboard items', () => {
    test('ensure the expected env vars are in place', () => {
        assertEnv()
    })
    const url = `${process.env.HOST}:${process.env.PORT}`
    const fixtureDir = getFixtureDir(process.env.DHIS2_IMAGE)

    console.log(`Running tests agains URL "${url}"`)

    test(`produces the expected HTML for a dashboard with all dashboard item types`, async () => {
        const req = request(url)
        const dashboardId = 'ceneQPMhemM'
        const username = 'test_user_national'
        const locale = 'en'
        const filePath = path.resolve(fixtureDir, `${dashboardId}_${username}.txt`)
        const expectedHtml = fs.readFileSync(filePath).toString()
        const response = await req.get('/').query({ dashboardId, username, locale })

        assert.strictEqual(response.status, 200)

        const actualHtml = response.text
        // Enable line below to generate new fixture
        // fs.writeFileSync(filePath, actualHtml)

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
        console.log(`Actual and expected string are ${similarity * 100}% similar`)
        if (similarity <= 0.8) {
            fs.writeFileSync(path.resolve('./generated-html'), actualHtml)
        }
        assert.strictEqual(similarity > 0.8, true)
    })
})
