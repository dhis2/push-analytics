type Interpolator = Record<string, string>

const containerTemplate = `
<div class="dashboard-item">
    <div class="dashboard-item-inner">{{content}}</div>
</div>
`
const headertemplate = `
<h2 class="dashboard-item-header">{{name}}</h2>
`

const trimNewlines = (str: string) => str.replace(/\n^/, '').replace(/\n$/, '')

export const inline = (str: string) => str.replace(/\s+/g, '')

export const parseTemplate = (template: string, interpolator: Interpolator): string =>
    Object.entries(interpolator).reduce(
        (populatedTemplate, [key, value]) =>
            populatedTemplate.replaceAll(`{{${key}}}`, value),
        trimNewlines(template)
    )

export const parseDashboardItemTemplate = (
    itemTemplate: string,
    interpolator: Interpolator
): string => {
    const { name, ...rest } = interpolator
    const header = name ? parseTemplate(headertemplate, { name }) : ''
    const content = header + parseTemplate(itemTemplate, rest)
    return parseTemplate(containerTemplate, { content })
}
