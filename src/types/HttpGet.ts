export type FieldObject = {
    name: string
    fields: Field[]
}

export type Field = string | FieldObject
