// Piscina worker needs to be JS not TS, so we transpile it here
require('ts-node').register({ transpileOnly: true })
const transpiledWorker = require('./worker')

module.exports = transpiledWorker
