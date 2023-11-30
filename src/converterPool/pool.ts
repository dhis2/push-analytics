import path from 'path'
import Piscina from 'piscina'

export const pool = new Piscina({
    filename: path.resolve(__dirname, 'transpiledWorker.js'),
    maxThreads: 5,
})
