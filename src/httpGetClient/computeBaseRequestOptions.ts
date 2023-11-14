import http from 'http'

type Options = {
    baseUrl: string
    apiVersion: string
    username: string
    password: string
}

export const computeBaseRequestOptions = ({
    baseUrl,
    apiVersion,
    username,
    password,
}: Options) => {
    const protocol = baseUrl.includes('https://') ? 'https:' : 'http:'
    const [host, port] = baseUrl.replace(`${protocol}//`, '').split(':')
    const baseRequestOptions: http.RequestOptions = {
        method: 'GET',
        headers: {},
        auth: `${username}:${password}`,
        path: `/api/${apiVersion}`,
        protocol,
        host,
    }

    if (port) {
        baseRequestOptions.port = parseInt(port)
    }

    return baseRequestOptions
}
