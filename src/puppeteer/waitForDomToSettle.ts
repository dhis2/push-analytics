import type { PageWithRelativeNavigation } from '../types'

export const waitForDomToSettle = (
    page: PageWithRelativeNavigation,
    timeoutMs = 30000,
    debounceMs = 1000
) =>
    page.evaluate(
        (timeoutMs, debounceMs) => {
            const debounce = (func: () => void, ms = 1000) => {
                let timeout: ReturnType<typeof setTimeout>
                return () => {
                    console.log('in debounce, clearing timeout again')
                    clearTimeout(timeout)
                    timeout = setTimeout(() => {
                        func.apply(this)
                    }, ms)
                }
            }
            return new Promise((resolve, reject) => {
                const mainTimeout = setTimeout(() => {
                    observer.disconnect()
                    reject(
                        new Error('Timed out whilst waiting for DOM to settle')
                    )
                }, timeoutMs)

                const debouncedResolve = debounce(async () => {
                    observer.disconnect()
                    clearTimeout(mainTimeout)
                    resolve(true)
                }, debounceMs)

                const observer = new MutationObserver(() => {
                    debouncedResolve()
                })
                const config = {
                    attributes: true,
                    childList: true,
                    subtree: true,
                }
                observer.observe(document.body, config)
            })
        },
        timeoutMs,
        debounceMs
    )
