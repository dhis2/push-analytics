import axios from 'axios'
import type { Dashboard } from '../types'
import { fieldsArrayToQueryString } from './fieldsArrayToQueryString'

const FIELDS = [
    'displayName',
    'itemCount',
    {
        name: 'dashboardItems',
        fields: [
            'id',
            'type',
            'text',
            'x',
            'y',
            { name: 'eventChart', fields: ['id', 'name', 'type'] },
            { name: 'eventReport', fields: ['id', 'name', 'type'] },
            { name: 'eventVisualization', fields: ['id', 'name', 'type'] },
            { name: 'map', fields: ['id', 'name'] },
            { name: 'reports', fields: ['id', 'name', 'type'] },
            { name: 'resources', fields: ['id', 'name'] },
            { name: 'visualization', fields: ['id', 'name', 'type'] },
        ],
    },
]

type CreateDashboardGetterOptions = {
    apiVersion: string
    baseUrl: string
    password: string
    username: string
}
export const createDashboardGetter =
    ({
        apiVersion,
        baseUrl,
        password,
        username,
    }: CreateDashboardGetterOptions) =>
    async (dashboardId: string) => {
        const url = `${baseUrl}/api/${apiVersion}/dashboards/${dashboardId}`
        const options = {
            params: {
                fields: fieldsArrayToQueryString(FIELDS),
            },
            auth: { username, password },
        }
        const result = await axios.get<Dashboard>(url, options)
        return result.data
    }
