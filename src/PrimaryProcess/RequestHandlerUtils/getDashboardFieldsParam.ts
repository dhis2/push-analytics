import type { Field } from '../../types'
import { RequestHandlerError } from './RequestHandlerError'

export function getDashboardFieldsParam() {
    return [
        'displayName',
        {
            name: 'dashboardItems',
            fields: [
                'id',
                'type',
                'text',
                'x',
                'y',
                { name: 'eventChart', fields: ['id', 'name', 'type'] },
                { name: 'eventReport', fields: ['id', 'name', 'type'] },
                { name: 'eventVisualization', fields: ['id', 'name', 'type'] },
                { name: 'map', fields: ['id', 'name'] },
                { name: 'reports', fields: ['id', 'name', 'type'] },
                { name: 'resources', fields: ['id', 'name'] },
                { name: 'visualization', fields: ['id', 'name', 'type'] },
            ],
        },
    ]
        .map(parseField)
        .join()
}

function parseField(field: Field): string {
    if (typeof field === 'string') {
        return field
    } else if (field.name && Array.isArray(field.fields)) {
        return `${field.name}[${field.fields.map(parseField).join()}]`
    } else {
        throw new RequestHandlerError('Could not parse query fields')
    }
}
