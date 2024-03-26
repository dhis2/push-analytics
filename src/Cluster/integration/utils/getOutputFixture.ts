import fs from 'node:fs'
import path from 'path'

const fixturesDir = path.resolve('./src/Cluster/integration/fixtures/output')

export function getOutputFixture(id: string) {
    return fs.readFileSync(path.join(fixturesDir, `${id}.txt`), 'utf8')
}
