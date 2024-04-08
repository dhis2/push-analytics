import nock from 'nock'
import type { PushAnalyticsEnvVariables } from '../../../types'
import type { DashboardFixture } from './getDashboardFixture'

export function nockDashboardsResponses(
    env: PushAnalyticsEnvVariables,
    dashboardsFixtures: DashboardFixture[]
) {
    for (const dashboard of dashboardsFixtures) {
        const dashboardRequestRegex = new RegExp(
            `^/api/${env.apiVersion}/dashboards/${dashboard.id}?.*$`
        )

        nock(env.baseUrl).persist().get(dashboardRequestRegex).reply(200, dashboard)
    }
}
