const template = `
<div>
    <h4>{{name}}</h4>
    <img src="data:image/png;base64,{{base64Str}}"></img>
</div>
`

export const insertIntoChartTemplate = (name: string, base64Str: string) =>
    template.replace('{{name}}', name).replace('{{base64Str}}', base64Str)
