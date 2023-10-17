import type { Page, GoToOptions } from 'puppeteer'

export type PageWithRelativeNavigation = Page & {
    gotoPath: (path: string, options?: GoToOptions) => Promise<void>
}
