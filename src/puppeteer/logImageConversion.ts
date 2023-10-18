export const logImageConversion = (type: string, fullFilePath: string) => {
    console.log(
        `Converted ${type.toLowerCase()} "${fullFilePath
            .slice(fullFilePath.lastIndexOf('/') + 1)
            .replace('.png', '')}"`
    )
}
