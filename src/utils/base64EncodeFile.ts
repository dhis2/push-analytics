import fs from 'fs'

export const base64EncodeFile = (path: string): string => {
    const bitmap = fs.readFileSync(path)
    // convert binary data to base64 encoded string
    return Buffer.from(bitmap).toString('base64')
}
