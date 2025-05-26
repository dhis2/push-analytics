import path from 'node:path'
import assert from 'node:assert'

export function assertEnv() {
    assert.ok(process.env.HOST)
    assert.ok(process.env.PORT)
    assert.ok(process.env.DHIS2_IMAGE)
}

export function getFixtureDir(dhis2ImageTag = '') {
    const imageTagDir = dhis2ImageTag
        .replace('dhis2/', '')
        .replace(':', '_')
        .replace('.', '-')
    const fixturesPath = path.resolve('./e2e/__fixtures__', imageTagDir)

    console.log(`Using fixtures from "${fixturesPath}"`)

    return fixturesPath
}
