import cluster from 'node:cluster'
import { waitMs } from './waitMs'

/* Note that this is an async function with a default timeout
 * of 0ms, which does not make much sense. But changing it
 * to a synchronous function had some adverse effects: some of
 * the worker process assertions did not show up in the test
 * anymore. So we keep the 0ms delay mainly for that reason
 * but it is also convenient for the one test that does
 * need a longer delay. */
export async function tearDownCluster(delay: number = 0) {
    await waitMs(delay)

    if (cluster.isPrimary) {
        for (const id in cluster.workers) {
            cluster.workers[id]?.kill()
        }
        process.exit(0)
    }
}
