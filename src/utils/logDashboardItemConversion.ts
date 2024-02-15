const sanitizeType = (type: string) => type.replaceAll('_', ' ').toLowerCase()
const sanitizeName = (name: string) =>
    name.includes('/') && name.includes('.png')
        ? name.slice(name.lastIndexOf('/') + 1).replace('.png', '')
        : name

export function logDashboardItemConversion(
    type: string,
    name: string,
    duration: string
) {
    const cleanedType = sanitizeType(type)
    const cleanedName = sanitizeName(name)
    console.log(`Converted ${cleanedType} "${cleanedName}" in ${duration} sec`)
}
