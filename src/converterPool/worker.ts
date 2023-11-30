import { ConvertOptions, converterQueue } from './converterQueue'

export default async function ({ item, username, password }: ConvertOptions) {
    const { convert, release } = converterQueue.getConverter()
    await convert({ item, username, password })
    release()
}
