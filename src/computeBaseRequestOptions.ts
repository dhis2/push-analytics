type ParseUrlResult = {
    host: string
    protocol: string
    port?: number
}

const parseUrl = (url: string): ParseUrlResult => {
    const protocol = url.includes('https://') ? 'https:' : 'http:'
    const [host, port] = url.replace(`${protocol}//`, '').split(':')
    const options: ParseUrlResult = { protocol, host }

    if (port) {
        options.port = parseInt(port)
    }

    return options
}

export const computeBaseRequestOptions = (
    options: DashboardToEmailConverterOptions
) => {
    const headers = {}
    const auth = `${options.dhis2CoreUsername}:${options.dhis2CorePassword}`
    const path = `/api/${options.dhis2CoreMajorVersion}`

    return {
        headers,
        auth,
        path,
        ...parseUrl(options.dhis2CoreUrl),
    }
}
