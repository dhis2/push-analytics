export function sanitizeSearchReplaceValue(value: string = '') {
    // Strip leading and trailing &
    return value.replace(/^&|&$/g, '')
}
