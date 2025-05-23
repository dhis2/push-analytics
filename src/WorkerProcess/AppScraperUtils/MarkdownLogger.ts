import fs from 'fs'
import path from 'path'
import type { Page } from 'puppeteer'
import type { LogLevel, QueueItem } from '../../types'

const BASE_DIR = './scrape-markdown-logs'
const SCREENSHOTS_DIR = 'screenshots'

export class MarkdownLogger {
    #page: Page
    #shouldLog: boolean
    #logDir: string
    #logFile: string
    #logScreenshotsDir: string
    #screeshotId: number

    constructor(page: Page) {
        const logLevel = (process.env['LOG_LEVEL'] ?? 'off') as LogLevel
        this.#page = page
        this.#shouldLog = logLevel === 'verbose' || logLevel === 'scraper'
        this.#logDir = path.resolve(BASE_DIR, process.pid.toString())
        this.#logFile = path.resolve(this.#logDir, 'log.md')
        this.#logScreenshotsDir = path.resolve(this.#logDir, SCREENSHOTS_DIR)
        this.#screeshotId = 0

        if (this.#shouldLog) {
            this.#prepareLogDir()
            console.log(`Initializing MarkdownLogger for PID ${process.pid}`)
        }
    }

    startLogForItem(queueItem: QueueItem) {
        if (this.#shouldLog) {
            const { dashboardItem } = queueItem
            const name: string =
                dashboardItem.eventChart?.name ??
                dashboardItem.eventReport?.name ??
                dashboardItem.eventVisualization?.name ??
                dashboardItem.map?.name ??
                dashboardItem.visualization?.name ??
                'UNKNOWN NAME'
            const lines = [
                '___', // Start with horizontal line
                `# Scrape log for: ${name}`, // Header with name
                '```json', // Start JSON code block
                JSON.stringify(queueItem, null, 4), // Pretty JSON
                '```', // End JSON code block
            ]
            this.#appendToLogFile(lines.join('\n'))
        }
    }

    async log(message: string, takeScreenshot = true, downloadPage?: Page) {
        if (this.#shouldLog) {
            this.#appendToLogFile(`___\n${message}`)
            if (takeScreenshot) {
                await this.#logScreenShot(downloadPage)
            }
        }
    }

    logSuccess() {
        if (this.#shouldLog) {
            this.#appendToLogFile(
                '## Conversion completed successfully :white_check_mark:'
            )
        }
    }

    logError(message: string) {
        if (this.#shouldLog) {
            this.#appendToLogFile(`## Conversion failed :x:\n${message}`)
        }
    }

    async #logScreenShot(downloadPage?: Page) {
        this.#screeshotId++
        const fileName = `img_${this.#screeshotId}.png`
        const filePath = path.resolve(this.#logScreenshotsDir, fileName)
        const relativeFilePath = `./${SCREENSHOTS_DIR}/${fileName}`
        const page = downloadPage ?? this.#page
        await page.screenshot({ path: filePath })
        this.#appendToLogFile(`![screenshot](${relativeFilePath})`)
    }

    #appendToLogFile(content: string) {
        fs.appendFileSync(this.#logFile, `${content}\n`)
    }

    #prepareLogDir() {
        if (!fs.existsSync(BASE_DIR)) {
            fs.mkdirSync(BASE_DIR)
        }

        // Remove logs from previous runs if they exist
        if (fs.existsSync(this.#logDir)) {
            fs.rmdirSync(this.#logDir)
        }

        fs.mkdirSync(this.#logDir)
        fs.mkdirSync(this.#logScreenshotsDir)
    }
}
