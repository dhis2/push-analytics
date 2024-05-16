import { initializeCluster } from './Cluster'
import { debugLog } from './debugLog'

initializeCluster().catch((error) => {
    debugLog(`Could not initialize cluster "${error?.message}"`)
})
