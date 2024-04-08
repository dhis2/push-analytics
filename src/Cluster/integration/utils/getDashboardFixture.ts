import iMnYyBfSxmM from '../fixtures/dashboards/iMnYyBfSxmM.json'
import nghVC4wtyzi from '../fixtures/dashboards/nghVC4wtyzi.json'
import rmPiJIPFL4U from '../fixtures/dashboards/rmPiJIPFL4U.json'
import type { Dashboard } from '../../../types'

export type DashboardFixture = Dashboard & { id: string }

export const DASHBOARD_FIXTURES: Map<string, DashboardFixture> = new Map([
    ['iMnYyBfSxmM', iMnYyBfSxmM as DashboardFixture],
    ['nghVC4wtyzi', nghVC4wtyzi as DashboardFixture],
    ['rmPiJIPFL4U', rmPiJIPFL4U as DashboardFixture],
])

export function getDashboardFixture(id: string): DashboardFixture {
    const fixture = DASHBOARD_FIXTURES.get(id)

    if (!fixture) {
        throw new Error(`Could not find fixture with ID "${id}"`)
    }

    return fixture
}
