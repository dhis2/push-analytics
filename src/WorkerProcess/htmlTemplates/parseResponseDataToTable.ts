import { parseDashboardItemTemplate } from './parseTemplate'

type ResponseData = {
    headers: { column: string }[]
    rows: Array<string[]>
}

const template = `
<table>
    <thead>
        <tr>
            {{headerRow}}
        </tr>
    </thead>
    <tbody>
        {{bodyRows}}
    </tbody>
</table>`

function toCells(cells: string[]) {
    return cells.map((cellContent) => `<td>${cellContent}</td>`).join('\n')
}

export function parseResponseDataToTable({ headers, rows }: ResponseData) {
    const headerRow = headers.map(({ column }) => `<th>${column}</th>`).join('\n')
    const bodyRows = rows.map((cells) => `<tr>${toCells(cells)}</tr>`).join('\n')
    return parseDashboardItemTemplate(template, { headerRow, bodyRows })
}
