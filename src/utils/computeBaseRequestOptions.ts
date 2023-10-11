import http from 'http'

export const computeBaseRequestOptions = ({
    dhis2CoreUrl,
    dhis2CoreMajorVersion,
    dhis2CoreUsername,
    dhis2CorePassword,
}: DashboardToEmailConverterOptions) => {
    const protocol = dhis2CoreUrl.includes('https://') ? 'https:' : 'http:'
    const [host, port] = dhis2CoreUrl.replace(`${protocol}//`, '').split(':')
    const baseRequestOptions: http.RequestOptions = {
        headers: {},
        auth: `${dhis2CoreUsername}:${dhis2CorePassword}`,
        path: `/api/${dhis2CoreMajorVersion}`,
        protocol,
        host,
    }

    if (port) {
        baseRequestOptions.port = parseInt(port)
    }

    return baseRequestOptions
}
