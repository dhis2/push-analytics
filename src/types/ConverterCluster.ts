import { ServerResponse } from 'node:http'
import { Browser } from 'puppeteer'
import type { DashboardItem } from '.'
import { Authenticator } from '../worker/Authenticator'

export type AddDashboardOptions = {
    requestId: number
    response: ServerResponse
    username: string
    dashboardId: string
    displayName: string
    dashboardItems: DashboardItem[]
}

export type ConvertedItem = {
    requestId: number
    dashboardId: string
    username: string
    dashboardItemId: string
    html: string
    css: string
}

export type ConversionError = Omit<ConvertedItem, 'html' | 'css'> & {
    errorMessage: string
}

export type QueueItem = {
    requestId: number
    dashboardId: string
    dashboardItem: DashboardItem
    username: string
}

export type MessageType =
    | 'ITEMS_ADDED_TO_QUEUE'
    | 'ITEM_REQUESTED_FROM_QUEUE'
    | 'ITEM_TAKEN_FROM_QUEUE'
    | 'ITEM_CONVERTED'
    | 'ITEM_CONVERSION_ERROR'

export type Message<T extends MessageType, P> = {
    type: T
    payload?: P
}

export type ItemsAddedToQueueMessage = Message<
    'ITEMS_ADDED_TO_QUEUE',
    undefined
>

export type ItemRequestedFromQueueMessage = Message<
    'ITEM_REQUESTED_FROM_QUEUE',
    undefined
>

export type ItemTakenFromQueueMessage = Message<
    'ITEM_TAKEN_FROM_QUEUE',
    QueueItem
>

export type ItemConvertedMessage = Message<'ITEM_CONVERTED', ConvertedItem>

export type ItemConversionErrorMessage = Message<
    'ITEM_CONVERSION_ERROR',
    ConversionError
>

export type ConverterResult = {
    html: string
    css: string
}

export interface Converter {
    convert: (queueItem: QueueItem) => Promise<ConverterResult>
    init?: (browser: Browser, authenticator: Authenticator) => Promise<void>
    takeErrorScreenShot?: (queueItem: QueueItem) => Promise<void>
}
