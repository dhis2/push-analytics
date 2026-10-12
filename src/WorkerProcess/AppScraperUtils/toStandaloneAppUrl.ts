export function toStandaloneAppUrl(url: string) {
    const parsedUrl = new URL(url)

    if (!parsedUrl.pathname.endsWith('/index.html')) {
        parsedUrl.pathname = `${parsedUrl.pathname.replace(/\/$/, '')}/index.html`
    }

    parsedUrl.searchParams.set('redirect', 'false')

    return parsedUrl.toString()
}
