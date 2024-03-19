import { AppScraperError } from './AppScraperError'

export function getNestedPropertyValue(obj: object, propertyPath: string) {
    const nestedValue = propertyPath
        .split('.')
        .reduce((val: object | string | number | boolean, key: string) => {
            /* Below is a small TypeScript hoop we had to jump through:
             * There is absolutely no way to guarrantee that (nested)
             * properties like 'visualization.type' actually exist on the
             * provided object. And since these are ultimately coming from
             * the JSON config files, which are meant to be generic, there is
             * no point creating types for this. So we have to explcitely
             * tell TS the provided string represents a valid object path
             * to avoid a compilation error. */
            try {
                val = val[key as keyof typeof val]
            } catch {
                throw new AppScraperError(
                    `Found invalid dashboard item property "${propertyPath}"`
                )
            }

            return val
        }, obj)

    if (typeof nestedValue === 'object') {
        throw new AppScraperError('Value found on property path was not a primitive')
    }

    return nestedValue as string | boolean | number
}
