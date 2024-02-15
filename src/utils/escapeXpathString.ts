export function escapeXpathString(str: string): string {
    const splitedQuotes = str.replace(/'/g, `', "'", '`)
    return `concat('${splitedQuotes}', '')`
}
