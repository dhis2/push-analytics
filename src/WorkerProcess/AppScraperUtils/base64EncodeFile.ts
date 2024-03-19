import fs from 'fs'
import fsPromises from 'node:fs/promises'
import { AppScraperError } from './AppScraperError'

export async function base64EncodeFile(path: string): Promise<string> {
    if (!fs.existsSync(path)) {
        throw new AppScraperError(`Did not find a file on path "${path}"`)
    }

    const bitmap = await fsPromises.readFile(path)

    if (bitmap.byteLength > 0) {
        return Buffer.from(bitmap).toString('base64')
    } else {
        return new Promise((resolve, reject) => {
            // try one more time after a delay
            setTimeout(() => {
                fs.readFile(path, (error, retriedBitmap) => {
                    if (error) {
                        reject(new AppScraperError(error.message))
                    } else if (retriedBitmap.byteLength === 0) {
                        reject(new AppScraperError('Bitmap still empty after retry'))
                    } else {
                        resolve(Buffer.from(retriedBitmap).toString('base64'))
                    }
                })
            }, 500)
        })
    }
}
