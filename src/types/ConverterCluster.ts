import type { ServerResponse } from 'node:http'
import type { Browser } from 'puppeteer'
import type { DashboardItem, ParsedScrapeInstructions } from '.'
import type { Authenticator } from '../WorkerProcess/Authenticator'

export type AddDashboardOptions = {
    requestId: number
    response: ServerResponse
    username: string
    dashboardId: string
    displayName: string
    dashboardItems: DashboardItem[]
}

export type ConvertedItemPayload = {
    requestId: number
    dashboardId: string
    username: string
    dashboardItemId: string
    html: string
    css: string
}

export type ConversionErrorPayload = Omit<ConvertedItemPayload, 'html' | 'css'> & {
    errorMessage: string
    errorName: string
    errorCode: string
    httpResponseStatusCode: number
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

export type ItemsAddedToQueueMessage = Message<'ITEMS_ADDED_TO_QUEUE', undefined>

export type ItemRequestedFromQueueMessage = Message<
    'ITEM_REQUESTED_FROM_QUEUE',
    undefined
>

export type ItemTakenFromQueueMessage = Message<'ITEM_TAKEN_FROM_QUEUE', QueueItem>

export type ItemConvertedMessage = Message<'ITEM_CONVERTED', ConvertedItemPayload>

export type ItemConversionErrorMessage = Message<
    'ITEM_CONVERSION_ERROR',
    ConversionErrorPayload
>

export type PrimaryProcessEmittedMessage =
    | ItemsAddedToQueueMessage
    | ItemTakenFromQueueMessage

export type WorkerProcessEmittedMessage =
    | ItemRequestedFromQueueMessage
    | ItemConvertedMessage
    | ItemConversionErrorMessage

export type ConverterResult = {
    html: string
    css: string
}

export interface Converter {
    convert: (
        queueItem: QueueItem,
        config: ParsedScrapeInstructions
    ) => Promise<ConverterResult>
    init?: (browser: Browser, authenticator: Authenticator) => Promise<void>
    takeErrorScreenShot?: (queueItem: QueueItem) => Promise<void>
}
