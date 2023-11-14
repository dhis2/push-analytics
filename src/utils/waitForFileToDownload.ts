import fs from 'fs'
import path from 'path'

const checkFile = (dir: string) => {
    try {
        const fileNames = fs.readdirSync(dir)
        const fileName =
            Array.isArray(fileNames) && fileNames.length === 1
                ? fileNames[0]
                : ''

        return fileName && !fileName.endsWith('.crdownload')
            ? path.join(dir, fileName)
            : ''
    } catch {
        return ''
    }
}

export const waitForFileToDownload = async (dir: string): Promise<string> => {
    return new Promise((resolve) => {
        let fileName = checkFile(dir)
        if (fileName) {
            resolve(fileName)
        } else {
            const interval = setInterval(() => {
                fileName = checkFile(dir)
                if (fileName) {
                    clearInterval(interval)
                    resolve(fileName)
                }
            }, 20)
        }
    })
}
