import fs from 'fs'
import path from 'path'
import { AppScraperError } from './AppScraperError'

/* Note that 20 * 500 = 10000 ms so we wait max 10 sec
 * for a file download to complete */
const INTERVAL = 20
const MAX_TRIES = 500

function checkFile(dir: string) {
    try {
        const fileNames = fs.readdirSync(dir)
        const fileName =
            Array.isArray(fileNames) && fileNames.length === 1 ? fileNames[0] : ''

        return fileName && !fileName.endsWith('.crdownload')
            ? path.join(dir, fileName)
            : ''
    } catch {
        return ''
    }
}

export async function waitForFileToDownload(dir: string): Promise<string> {
    return await new Promise((resolve, reject) => {
        let tries = 0
        let fileName = checkFile(dir)
        if (fileName) {
            resolve(fileName)
        } else {
            const interval = setInterval(() => {
                tries++
                fileName = checkFile(dir)
                if (fileName) {
                    clearInterval(interval)
                    resolve(fileName)
                }
                if (tries === MAX_TRIES) {
                    clearInterval(interval)
                    reject(new AppScraperError('Could not find file'))
                }
            }, INTERVAL)
        }
    })
}
