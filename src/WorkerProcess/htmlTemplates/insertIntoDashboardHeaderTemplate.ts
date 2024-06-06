import { parseTemplate } from './parseTemplate'

const template =
    '<h1 class="dashboard-header"><a target="_blank" class="dashboard-link" href="{{baseUrl}}/dhis-web-dashboard/#/{{dashboardId}}">{{displayName}}</a></h1>'

export const insertIntoDashboardHeaderTemplate = (
    baseUrl: string,
    dashboardId: string,
    displayName: string
) => parseTemplate(template, { baseUrl, dashboardId, displayName })
