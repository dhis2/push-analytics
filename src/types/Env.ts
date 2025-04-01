export type EnvVariableName =
    | 'HOST'
    | 'PORT'
    | 'DHIS2_CORE_URL'
    | 'DHIS2_CORE_MAJOR_VERSION'
    | 'DHIS2_CORE_ADMIN_USERNAME'
    | 'DHIS2_CORE_ADMIN_PASSWORD'
    | 'DHIS2_CORE_SESSION_TIMEOUT'
    | 'MAX_THREADS'
    | 'NODE_ENV'
    | 'LOG_LEVEL'

export type NodeEnvContext = 'development' | 'production' | 'ci' | 'testing'
export type LogLevel = 'off' | 'on' | 'verbose' | 'scraper'

export type PushAnalyticsEnvVariables = {
    host: string
    port: string
    baseUrl: string
    apiVersion: string
    adminUsername: string
    adminPassword: string
    maxThreads: string
    sessionTimeout: string
    nodeEnv: NodeEnvContext
    logLevel: LogLevel
}
