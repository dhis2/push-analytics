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

export type QueueItem = {
    requestId: number
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

export type ConverterResult = {
    html: string
    css: string
}

export interface Converter {
    convert: (queueItem: QueueItem) => Promise<ConverterResult>
    init?: (browser: Browser, authenticator: Authenticator) => Promise<void>
    takeErrorScreenShot?: (queueItem: QueueItem) => Promise<void>
}
