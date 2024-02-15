import fsPromises from 'node:fs/promises'

export async function clearDir(dir: string): Promise<void> {
    await fsPromises.rm(dir, {
        recursive: true,
        force: true,
    })
}
