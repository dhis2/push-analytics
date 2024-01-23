import { Browser } from 'puppeteer'
import type { DashboardItem } from '.'

export type OnConversionCompleteFn = (html: string) => void

export type AddDashboardOptions = {
    dashboardId: string
    username: string
    displayName: string
    dashboardItems: DashboardItem[]
    onComplete: OnConversionCompleteFn
}

export type ConvertedItem = {
    dashboardId: string
    username: string
    dashboardItemId: string
    html: string
    css: string
}

export type QueueItem = {
    dashboardId: string
    dashboardItem: DashboardItem
    username: string
}

export type MessageType =
    | 'WORKER_INITIALIZED'
    | 'ITEM_CONVERSION_REQUEST'
    | 'ITEM_CONVERSION_RESULT'

export type Message<T extends MessageType, P> = {
    type: T
    payload?: P
}

export type ConversionRequestMessage = Message<
    'ITEM_CONVERSION_REQUEST',
    QueueItem
>

export type ConversionResultMessage = Message<
    'ITEM_CONVERSION_RESULT',
    ConvertedItem
>

export type WorkerInitializedMessage = Message<'WORKER_INITIALIZED', undefined>

export type ConverterResultObject = {
    html: string
    css: string
}
export type ConverterResult = string | ConverterResultObject

export interface Converter<T extends ConverterResult> {
    convert: (queueItem: QueueItem) => Promise<T>
    init?: (browser: Browser) => Promise<void>
    takeErrorScreenShot?: (queueItem: QueueItem) => Promise<void>
}
