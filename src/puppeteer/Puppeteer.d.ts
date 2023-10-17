type PageWithRelativeNavigation = Page & {
    gotoPath: (path: string, options?: GoToOptions) => Promise<void>
}
