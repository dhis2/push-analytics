type EnvVariableName =
    | 'HOST'
    | 'PORT'
    | 'DHIS2_CORE_URL'
    | 'DHIS2_CORE_MAJOR_VERSION'
    | 'MAX_THREADS'

const envVariableDefaults: Record<EnvVariableName, string> = {
    HOST: 'localhost',
    PORT: '1337',
    DHIS2_CORE_URL: 'http://localhost:8080',
    DHIS2_CORE_MAJOR_VERSION: '40',
    MAX_THREADS: 'max',
}

const readEnvVariable = (name: EnvVariableName): string => {
    if (process.env[name]) {
        return process.env[name] ?? ''
    } else {
        console.log(
            `Env variable "${name}" not found. Using default value "${envVariableDefaults[name]}" instead`
        )
        return envVariableDefaults[name]
    }
}

export const readEnv = () => ({
    host: readEnvVariable('HOST'),
    port: readEnvVariable('PORT'),
    baseUrl: readEnvVariable('DHIS2_CORE_URL'),
    apiVersion: readEnvVariable('DHIS2_CORE_MAJOR_VERSION'),
    maxThreads: readEnvVariable('MAX_THREADS'),
})
