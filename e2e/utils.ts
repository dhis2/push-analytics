import path from 'node:path'

export function getFixtureDir() {
    if (!process.env.DHIS2_IMAGE) {
        throw new Error(
            'Ensure DHIS2_IMAGE is set before running these tests, because the fixtures are version specific'
        )
    }
    const imageTagDir = process.env.DHIS2_IMAGE.replace('dhis2/', '')
        .replace(':', '_')
        .replace('.', '-')
    const fixturesPath = path.resolve('./e2e/__fixtures__', imageTagDir)

    console.log(`Using fixtures from "${fixturesPath}"`)

    return fixturesPath
}
