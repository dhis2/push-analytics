export const getDashboard = async (
    dashboardId: string,
    fetchData: HttpGetFn
) => {
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
                { name: 'map', fields: ['id', 'name'] },
            ],
        },
    ]
    const result: Dashboard = await fetchData(path, fields)
    return result
}
