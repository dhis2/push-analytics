import cluster from 'node:cluster'
import { waitMs } from './waitMs'

/* The purpose of the delay here is to allow for some time for
 * all processes to completely resolve.  */
export async function tearDownCluster(delay: number = 150) {
    await waitMs(delay)

    if (cluster.isPrimary) {
        for (const id in cluster.workers) {
            cluster.workers[id]?.kill()
        }
        process.exit(0)
    }
}
