type FieldObject = {
    name: string
    fields: Field[]
}

type Field = string | FieldObject

type HttpGetFn = (path: string, fields: Field[]) => Promise<T>
