export class DashboardToEmailConverter {
    dhis2CoreUrl: string
    dhis2CoreUsername: string
    dhis2CorePassword: string

    constructor(
        dhis2CoreUrl: string,
        dhis2CoreUsername: string,
        dhis2CorePassword: string
    ) {
        this.dhis2CoreUrl = dhis2CoreUrl
        this.dhis2CoreUsername = dhis2CoreUsername
        this.dhis2CorePassword = dhis2CorePassword
    }

    async convert(dashboardId: string) {
        return `<h1>Hello dashboard: ${dashboardId}</h1>`
    }
}
