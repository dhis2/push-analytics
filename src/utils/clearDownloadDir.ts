import fs from 'node:fs/promises'
import { downloadPath } from './downloadPath'

export const clearDownloadDir = async () => {
    await fs.rm(downloadPath, { recursive: true, force: true })
}
