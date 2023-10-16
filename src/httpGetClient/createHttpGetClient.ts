import { fieldsArrayToQueryParam } from './fieldsArrayToQueryParam'
import { doGetRequest } from './doGetRequest'
import { computeBaseRequestOptions } from './computeBaseRequestOptions'

type CreateOptions = {
    baseUrl: string
    apiVersion: string
    username: string
    password: string
}

export const createHttpGetClient = ({
    baseUrl,
    apiVersion,
    username,
    password,
}: CreateOptions) => {
    const baseRequestOptions = computeBaseRequestOptions({
        baseUrl,
        apiVersion,
        username,
        password,
    })

    return async <T>(path: string, fields?: Field[]): Promise<T> => {
        let resolvedPath = baseRequestOptions.path + path

        if (Array.isArray(fields)) {
            resolvedPath += `?${fieldsArrayToQueryParam(fields)}`
        }

        return await doGetRequest({
            ...baseRequestOptions,
            path: resolvedPath,
        })
    }
}
