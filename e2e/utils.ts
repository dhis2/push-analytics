import path from 'node:path'
import assert from 'node:assert'
import fs from 'node:fs'

export function assertEnv() {
    assert.ok(process.env.HOST)
    assert.ok(process.env.PORT)
    assert.ok(process.env.DHIS2_IMAGE)
}

export function getFixtureDir(dhis2ImageTag = '') {
    const fixturesRoot = path.resolve('./e2e/__fixtures__')
    const imageTagDir = dhis2ImageTag
        .replace('dhis2/', '')
        .replace(':', '_')
        .replace('.', '-')
    const fixturesPath = fs.existsSync(path.resolve(fixturesRoot, imageTagDir))
        ? path.resolve(fixturesRoot, imageTagDir)
        : getNearestOlderFixtureDir(fixturesRoot, imageTagDir)

    console.log(`Using fixtures from "${fixturesPath}"`)

    return fixturesPath
}

/* The e2e workflow runs against every supported stable DHIS2 version, so a new
 * version can show up before anybody has generated fixtures for it. In that case
 * use the fixtures of the newest older version of the same image. */
function getNearestOlderFixtureDir(fixturesRoot: string, imageTagDir: string) {
    const [, imageName, version] = imageTagDir.match(/^(.+)_2-(\d+)$/) ?? []
    const candidates = fs
        .readdirSync(fixturesRoot)
        .map((dir) => dir.match(/^(.+)_2-(\d+)$/))
        .filter((match) => match?.[1] === imageName && Number(match[2]) < Number(version))
        .sort((a, b) => Number(b?.[2]) - Number(a?.[2]))
    assert.ok(candidates[0], `No fixtures found for "${imageTagDir}" or an older version`)

    return path.resolve(fixturesRoot, candidates[0][0])
}

export function saveActualHtml(fileName: string, actualHtml: string) {
    const dir = path.resolve('./e2e/generated-html')
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir)
    }
    fs.writeFileSync(path.resolve(dir, fileName), actualHtml)
}
