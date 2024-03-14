import type { EnvVariableName, PushAnalyticsEnvVariables } from '../types'

const envVariableDefaults: Record<EnvVariableName, string> = {
    HOST: 'localhost',
    PORT: '1337',
    DHIS2_CORE_URL: 'http://localhost:8080',
    DHIS2_CORE_MAJOR_VERSION: '40',
    DHIS2_CORE_ADMIN_USERNAME: 'admin',
    DHIS2_CORE_ADMIN_PASSWORD: 'district',
    MAX_THREADS: '4',
    DHIS2_CORE_SESSION_TIMEOUT: '3600',
}

function readEnvVariable(name: EnvVariableName): string {
    if (process.env[name]) {
        return process.env[name] ?? ''
    } else {
        console.log(
            `Env variable "${name}" not found. Using default value "${envVariableDefaults[name]}" instead`
        )
        return envVariableDefaults[name]
    }
}

export function readEnv(): PushAnalyticsEnvVariables {
    return {
        host: readEnvVariable('HOST'),
        port: readEnvVariable('PORT'),
        baseUrl: readEnvVariable('DHIS2_CORE_URL'),
        apiVersion: readEnvVariable('DHIS2_CORE_MAJOR_VERSION'),
        adminUsername: readEnvVariable('DHIS2_CORE_ADMIN_USERNAME'),
        adminPassword: readEnvVariable('DHIS2_CORE_ADMIN_PASSWORD'),
        maxThreads: readEnvVariable('MAX_THREADS'),
        sessionTimeout: readEnvVariable('DHIS2_CORE_SESSION_TIMEOUT'),
    }
}
