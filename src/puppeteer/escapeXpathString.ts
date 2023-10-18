export const escapeXpathString = (str: string) => {
    const splitedQuotes = str.replace(/'/g, `', "'", '`)
    return `concat('${splitedQuotes}', '')`
}
