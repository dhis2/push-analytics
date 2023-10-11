import http from 'http'
import { HttpResponseStatusError } from './HttpResponseStatusError'

export const doGetRequest = async (
    relativePath: string,
    options: http.RequestOptions
) =>
    new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            if (
                res.statusCode === undefined ||
                res.statusCode < 200 ||
                res.statusCode >= 300
            ) {
                return reject(
                    new HttpResponseStatusError(
                        `Get to "${relativePath}" failed`,
                        res.statusCode ?? 500
                    )
                )
            }
            let body: Buffer[] = []
            res.on('data', (chunk: Buffer) => {
                body.push(chunk)
            })
            res.on('end', () => {
                try {
                    body = JSON.parse(Buffer.concat(body).toString())
                } catch (e) {
                    reject(e)
                }
                resolve(body)
            })
        })
        req.on('error', (err) => {
            reject(err)
        })
        req.end()
    })
