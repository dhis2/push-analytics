import path from 'path'

const projectRootDir = process.cwd()
const subDir = process.env.NODE_ENV === 'production' ? 'dist' : ''

export const downloadPath = path.resolve(projectRootDir, subDir, 'images')
