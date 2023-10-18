const template = `
<!DOCTYPE html>
<html>
<body>
{{content}}
</body>
</html>
`

export const insertIntoEmailTemplate = (html: string) =>
    template.replace('{{content}}', html)
