import { parseTemplate } from './parseTemplate'

/* Below is a simplified version of the template found here:
 * https://github.com/timothylong/email-starter-kit/blob/master/basic.html
 * Some parts were removed:
 * - The preheader test parts
 * - The footer table */
const template = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width" initial-scale="1">
    <!--[if !mso]>
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <![endif]-->
    <meta name="x-apple-disable-message-reformatting">
    <title></title>
    <!--[if mso]>
        <style>
            * { font-family: sans-serif !important; }
        </style>
    <![endif]-->
    <!--[if !mso]><!-->
        <!-- Insert font reference, e.g. <link href="https://fonts.googleapis.com/css?family=Source+Sans+Pro:400,700" rel="stylesheet"> -->
    <!--<![endif]-->
    <style>
        *,
        *:after,
        *:before {
            -webkit-box-sizing: border-box;
            -moz-box-sizing: border-box;
            box-sizing: border-box;
        }
        * {
            -ms-text-size-adjust: 100%;
            -webkit-text-size-adjust: 100%;
        }
        html,
        body,
        .document {
            width: 100% !important;
            height: 100% !important;
            margin: 0;
            padding: 0;
        }
        body {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
        }
        div[style*="margin: 16px 0"] {
            margin: 0 !important;
        }
        table,
        td {
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }
        table {
            border-spacing: 0;
            border-collapse: collapse;
            table-layout: fixed;
            margin: 0 auto;
        }
        img {
            -ms-interpolation-mode: bicubic;
            max-width: 100%;
            border: 0;
        }
        *[x-apple-data-detectors] {
            color: inherit !important;
            text-decoration: none !important;
        }
        .x-gmail-data-detectors,
        .x-gmail-data-detectors *,
        .aBn {
            border-bottom: 0 !important;
            cursor: default !important;
        }
        .btn {
            -webkit-transition: all 200ms ease;
            transition: all 200ms ease;
        }
        .btn:hover {
            background-color: dodgerblue;
        }
        @media screen and (max-width: 750px) {
            .container {
                width: 100%;
                margin: auto;
            }
            .stack {
                display: block;
                width: 100%;
                max-width: 100%;
            }
        }
        {{css}}
    </style>
</head>
<body>
    <table role="presentation" aria-hidden="true" cellspacing="0" cellpadding="0" border="0" align="center" class="document">
        <tr>
            <td valign="top">
                <table role="presentation" aria-hidden="true" cellspacing="0" cellpadding="0" border="0" align="center" width="750" class="container">
                    <tr>
                        <td>
                            <table role="presentation" aria-hidden="true" cellspacing="0" cellpadding="0" border="0" align="left" width="100%">
                                <tr>
                                    <td class="dashboard">
                                        {{html}}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`

export const insertIntoEmailTemplate = (html: string, css: string) =>
    parseTemplate(template, { css: css, html })
