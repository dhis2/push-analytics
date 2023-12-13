import { Converter } from '../types/ConverterCluster'

export class UnsupportedTypeConverter implements Converter<string> {
    async convert() {
        return Promise.resolve('')
    }
}
