import type { Converter } from '../types'

export class UnsupportedTypeConverter implements Converter<string> {
    async convert() {
        return Promise.resolve('')
    }
}
