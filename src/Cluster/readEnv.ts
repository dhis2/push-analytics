import cluster from 'node:cluster'
import type {
    EnvVariableName,
    LogLevel,
    NodeEnvContext,
    PushAnalyticsEnvVariables,
} from '../types'

const envVariableDefaults: Record<EnvVariableName, string> = {
    HOST: 'localhost',
    PORT: '1337',
    DHIS2_CORE_URL: 'http://localhost:8080',
    DHIS2_CORE_MAJOR_VERSION: '40',
    DHIS2_CORE_ADMIN_USERNAME: 'admin',
    DHIS2_CORE_ADMIN_PASSWORD: 'district',
    MAX_THREADS: '4',
    DHIS2_CORE_SESSION_TIMEOUT: '3600',
    NODE_ENV: 'production',
    LOG_LEVEL: 'off',
}

function readEnvVariable(name: EnvVariableName): string | NodeEnvContext | LogLevel {
    if (process.env[name]) {
        return process.env[name] ?? ''
    } else {
        if (cluster.isPrimary) {
            console.log(
                `Env variable "${name}" not found. Using default value "${envVariableDefaults[name]}" instead`
            )
        }
        return envVariableDefaults[name]
    }
}

export function readEnv(): PushAnalyticsEnvVariables {
    const resolvedEnd = {
        host: readEnvVariable('HOST'),
        port: readEnvVariable('PORT'),
        baseUrl: readEnvVariable('DHIS2_CORE_URL'),
        apiVersion: readEnvVariable('DHIS2_CORE_MAJOR_VERSION'),
        adminUsername: readEnvVariable('DHIS2_CORE_ADMIN_USERNAME'),
        adminPassword: readEnvVariable('DHIS2_CORE_ADMIN_PASSWORD'),
        maxThreads: readEnvVariable('MAX_THREADS'),
        sessionTimeout: readEnvVariable('DHIS2_CORE_SESSION_TIMEOUT'),
        nodeEnv: readEnvVariable('NODE_ENV') as NodeEnvContext,
        logLevel: readEnvVariable('LOG_LEVEL') as LogLevel,
    }

    if (cluster.isPrimary) {
        console.log(
            `+++++++++\nresolved env:\n ${JSON.stringify(
                resolvedEnd,
                null,
                4
            )}\n=========`
        )
    }
    return resolvedEnd
}
