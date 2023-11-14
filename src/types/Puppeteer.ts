import type { Page, GoToOptions } from 'puppeteer'

export interface PageWithRelativeNavigation extends Page {
    gotoPath: (path: string, options?: GoToOptions) => Promise<void>
    setDownloadPathToItemId: (id: string) => string
    getDhis2BaseUrl: () => string
}
