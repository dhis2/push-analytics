import { DashboardItem } from '../types'
import { pool } from './pool'

export const convertDashboardItems = (dashboardItems: DashboardItem[]) =>
    Promise.all(dashboardItems.map((item) => pool.run(item))).then(
        (results) => {
            console.log(results)
            return results
        }
    )
