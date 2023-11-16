import type { Field } from '../types'

const parseField = (field: Field): string => {
    if (typeof field === 'string') {
        return field
    } else if (field.name && Array.isArray(field.fields)) {
        return `${field.name}[${field.fields.map(parseField).join()}]`
    } else {
        throw new Error('Could not parse fields')
    }
}

export const fieldsArrayToQueryString = (fields: Field[]): string =>
    fields.map(parseField).join()
