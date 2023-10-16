import http from 'http'
import { HttpResponseStatusError } from '../utils/HttpResponseStatusError'

export const doGetRequest = async <T>(
    options: http.RequestOptions
): Promise<T> =>
    new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            if (
                res.statusCode === undefined ||
                res.statusCode < 200 ||
                res.statusCode >= 300
            ) {
                return reject(
                    new HttpResponseStatusError(
                        `Get to "${options.path}" failed`,
                        res.statusCode ?? 500
                    )
                )
            }
            const body: Buffer[] = []
            res.on('data', (chunk: Buffer) => {
                body.push(chunk)
            })
            res.on('end', () => {
                try {
                    resolve(JSON.parse(Buffer.concat(body).toString()))
                } catch (e) {
                    reject(e)
                }
            })
        })
        req.on('error', (err) => {
            reject(err)
        })
        req.end()
    })
