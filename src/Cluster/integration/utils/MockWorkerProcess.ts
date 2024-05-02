import { WorkerProcess } from '../../../WorkerProcess'
import type { IAuthenticator } from '../../../WorkerProcess/Authenticator'
import type { IDashboardItemConverter } from '../../../WorkerProcess/DashboardItemConverter'
import type { IScrapeConfigCache } from '../../../WorkerProcess/ScrapeConfigCache'
import type {
    ConvertedItemPayload,
    ParsedScrapeInstructions,
    QueueItem,
} from '../../../types'
import scrapeInstructions from '../fixtures/scrapeInstructions.json'

export async function convertSuccessFn(
    queueItem: QueueItem
): Promise<ConvertedItemPayload> {
    const {
        eventChart,
        eventReport,
        eventVisualization,
        map,
        text,
        visualization,
        reports,
        resources,
    } = queueItem.dashboardItem
    const name =
        eventChart?.name ??
        eventReport?.name ??
        eventVisualization?.name ??
        map?.name ??
        visualization?.name ??
        (text && 'TEXT ITEM') ??
        (reports && 'REPORTS ITEM') ??
        (resources && 'RESOURCES ITEM')

    const convertedItemPayload: ConvertedItemPayload = {
        requestId: queueItem.requestId,
        dashboardId: queueItem.dashboardId,
        username: queueItem.username,
        dashboardItemId: queueItem.dashboardItem.id,
        html: `<h6>${name}</h6>`,
        css: '',
    }

    return convertedItemPayload
}

export class MockDashboardItemConverter implements IDashboardItemConverter {
    static async create() {
        return new MockDashboardItemConverter()
    }
    public isConverting() {
        return false
    }
    public async convert(queueItem: QueueItem): Promise<ConvertedItemPayload> {
        return await convertSuccessFn(queueItem)
    }
    public isAppScraperConversion() {
        return false
    }
}

class MockAuthenticator implements IAuthenticator {
    static async create() {
        return new MockAuthenticator()
    }
    public async establishNonExpiringAdminSession(): Promise<void> {
        return Promise.resolve()
    }
    public async impersonateUser() {
        return Promise.resolve()
    }
}

class MockScrapeConfigCache implements IScrapeConfigCache {
    public async getScrapeConfig(): Promise<ParsedScrapeInstructions> {
        return Promise.resolve(scrapeInstructions as ParsedScrapeInstructions)
    }
}

export class MockWorkerProcess extends WorkerProcess {
    static async create() {
        const converter = await MockDashboardItemConverter.create()
        const authenticator = await MockAuthenticator.create()
        const configCache = new MockScrapeConfigCache()
        await authenticator.establishNonExpiringAdminSession()
        return new MockWorkerProcess(converter, authenticator, configCache)
    }
}
