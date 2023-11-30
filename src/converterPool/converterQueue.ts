import { DashboardItem } from '../types'

type ConverterOptions = {
    baseUrl: string
    debug: boolean
}
export type ConvertOptions = {
    item: DashboardItem
    username: string
    password: string
}
type ConverterFn = (options: ConvertOptions) => Promise<string>
type InitializeQueueOptions = ConverterOptions & { queueLength: number }

const createDashboardItemConverter = async ({
    baseUrl,
    debug,
}: ConverterOptions): Promise<ConverterFn> => {
    // dummy fn to appease typescript
    return async ({ item, username, password }) => {
        console.log(
            'logging it all: ',
            baseUrl,
            username,
            password,
            item.id,
            debug
        )
        return '<h1>DUMMY HTML</h1>'
    }
}

const createConverterQueue = () => {
    let initialized = false
    const queue: ConverterFn[] = []
    return {
        async initializeQueue({
            baseUrl,
            debug,
            queueLength,
        }: InitializeQueueOptions) {
            if (initialized) {
                throw Error('Attempting to initialize queue several times')
            }
            for (let i = 0; i < queueLength; i++) {
                const converterFn = await createDashboardItemConverter({
                    baseUrl,
                    debug,
                })
                queue.push(converterFn)
            }
            console.log(
                'initialized the converter queue, length: ',
                queue.length
            )
            initialized = true
        },
        getConverter() {
            console.log('is there a queue', queue, queue.length)
            const converterFn = queue.pop()
            if (!converterFn) {
                throw new Error('No converters left')
            }
            console.log(
                'got an item from the converter queue, length: ',
                queue.length
            )
            return {
                convert: converterFn,
                release() {
                    queue.push(converterFn)
                },
            }
        },
    }
}

export const converterQueue = createConverterQueue()
