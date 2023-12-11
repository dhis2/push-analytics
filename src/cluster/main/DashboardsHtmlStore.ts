// import { DashboardHtmlCollection } from './types'

import { DashboardHtmlCollection } from './DashboardHtmlCollection'
import { OnCompleteFn } from '../types'

type CreateDashboardHtmlCollectionOptions = {
    baseUrl: string
    username: string
    dashboardId: string
    displayName: string
    onComplete: OnCompleteFn
}

const createKey = (dashboardId: string, username: string): string =>
    `${dashboardId}_${username}`

export class DashboardsHtmlStore {
    #store: Map<string, DashboardHtmlCollection>

    constructor() {
        this.#store = new Map()
    }

    public createDashboardHtmlCollection({
        baseUrl,
        username,
        dashboardId,
        displayName,
        onComplete,
    }: CreateDashboardHtmlCollectionOptions) {
        const onCompleteWithDelete = (html: string) => {
            onComplete(html)
            this.#store.delete(createKey(dashboardId, username))
        }
        const dashboardHtmlCollection = new DashboardHtmlCollection({
            baseUrl,
            dashboardId,
            displayName,
            onComplete: onCompleteWithDelete,
        })

        this.#store.set(
            createKey(dashboardId, username),
            dashboardHtmlCollection
        )

        return dashboardHtmlCollection
    }

    public getDashboardHtmlCollection(
        dashboardId: string,
        username: string
    ): DashboardHtmlCollection | undefined {
        return this.#store.get(createKey(dashboardId, username))
    }
}
