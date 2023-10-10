type DashboardToEmailConverterOptions = {
    dhis2CoreUrl: string
    dhis2CoreMajorVersion: string
    dhis2CoreUsername: string
    dhis2CorePassword: string
}

export class DashboardToEmailConverter {
    dhis2CoreUrl: string
    dhis2CoreMajorVersion: string
    dhis2CoreUsername: string
    dhis2CorePassword: string
    apiUrl: string

    constructor(options: DashboardToEmailConverterOptions) {
        this.dhis2CoreUrl = options.dhis2CoreUrl
        this.dhis2CoreMajorVersion = options.dhis2CoreMajorVersion
        this.dhis2CoreUsername = options.dhis2CoreUsername
        this.dhis2CorePassword = options.dhis2CorePassword
        this.apiUrl = `${options.dhis2CoreUrl}/api/${options.dhis2CoreMajorVersion}`
    }

    async convert(dashboardId: string) {
        return `<h1>Hello dashboard: ${dashboardId}</h1>`
    }
}
