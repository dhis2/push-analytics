import fs from 'fs'
import path from 'path'
import type { Page } from 'puppeteer'
import type { LogLevel, QueueItem } from '../../types'

const BASE_DIR = './scrape-markdown-logs'

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
        this.#logScreenshotsDir = path.resolve(this.#logDir, 'screenshots')
        this.#screeshotId = 0

        if (this.#shouldLog) {
            console.log(`Initializing logger for PID ${process.pid}`)
            this.#prepareLogDir()
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
            console.log(`Starting log for item ${name}`)
            const lines = [
                '___', // Start with vertical line
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
            console.log('Logged item conversion success')
        }
    }

    logError(message: string) {
        if (this.#shouldLog) {
            this.#appendToLogFile(`## Conversion failed :x:\n${message}`)
            console.log('Logged item conversion failure')
        }
    }

    async #logScreenShot(downloadPage?: Page) {
        this.#screeshotId++
        const fileName = `img_${this.#screeshotId}.png`
        const filePath = path.resolve(this.#logScreenshotsDir, fileName)
        const page = downloadPage ?? this.#page
        await page.screenshot({ path: filePath })
        this.#appendToLogFile(`![screenshot](${filePath})`)
    }

    #appendToLogFile(content: string) {
        fs.appendFileSync(this.#logFile, `${content}\n`)
    }

    #prepareLogDir() {
        if (!fs.existsSync(BASE_DIR)) {
            try {
                fs.mkdirSync(BASE_DIR)
                console.log(`Created base dir "${BASE_DIR}"`)
            } catch (error) {
                console.log('Could not make base dir!!!')
                console.log(error)
            }
        }

        // Remove logs from previous runs if they exist
        if (fs.existsSync(this.#logDir)) {
            fs.rmdirSync(this.#logDir)
        }

        fs.mkdirSync(this.#logDir)
        fs.mkdirSync(this.#logScreenshotsDir)
    }
}
