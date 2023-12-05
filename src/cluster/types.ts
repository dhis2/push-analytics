import type { DashboardItem } from '../types'

export type OnCompleteFn = (html: string) => void

export type AddDashboardOptions = {
    dashboardId: string
    username: string
    password: string
    displayName: string
    dashboardItems: DashboardItem[]
    onComplete: OnCompleteFn
}

export type ConvertedItem = {
    dashboardId: string
    username: string
    dashboardItemId: string
    html: string
    css: string
}

export type DashboardHtmlCollection = {
    items: Map<string, { html: string; css: string }>
    completedCount: number
    displayName: string
    onComplete: OnCompleteFn
}

export type DashboardsHtmlStore = Map<string, DashboardHtmlCollection>

export type QueueItem = {
    dashboardId: string
    dashboardItem: DashboardItem
    username: string
    password: string
}

export type MessageType =
    | 'ITEM_CONVERTER_READY'
    | 'ITEM_CONVERSION_REQUEST'
    | 'ITEM_CONVERSION_RESULT'

export type Message<T extends MessageType, P> = {
    type: T
    payload?: P
}

export type ConverterReadyMessage = Message<'ITEM_CONVERTER_READY', undefined>

export type ConversionRequestMessage = Message<
    'ITEM_CONVERSION_REQUEST',
    QueueItem
>

export type ConversionResultMessage = Message<
    'ITEM_CONVERSION_RESULT',
    ConvertedItem
>
