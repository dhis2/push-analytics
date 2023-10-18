const template = `
<!DOCTYPE html>
<html>
    <head>
        <style>
            {{css}}
        </style>
    </head>
    <body>
        {{html}}
    </body>
</html>
`

export const insertIntoEmailTemplate = (html: string, css: string) =>
    template.replace('{{css}}', css).replace('{{html}}', html)
