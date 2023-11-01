import type { Dashboard } from '../types'
import { createHttpGetClient } from './createHttpGetClient'

export const getDashboard = async (
    apiVersion: string,
    baseUrl: string,
    dashboardId: string,
    password: string,
    username: string
) => {
    const fetchData = createHttpGetClient({
        apiVersion,
        baseUrl,
        password,
        username,
    })
    const path = `/dashboards/${dashboardId}`
    const fields = [
        'displayName',
        'itemCount',
        {
            name: 'dashboardItems',
            fields: [
                'id',
                'type',
                { name: 'visualization', fields: ['id', 'name', 'type'] },
                { name: 'eventVisualization', fields: ['id', 'name', 'type'] },
                { name: 'eventReport', fields: ['id', 'name', 'type'] },
                { name: 'eventChart', fields: ['id', 'name', 'type'] },
                { name: 'map', fields: ['id', 'name'] },
            ],
        },
    ]

    return await (<Promise<Dashboard>>fetchData(path, fields))
}
