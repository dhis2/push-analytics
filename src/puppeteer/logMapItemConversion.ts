export const logMapItemConversion = (fullFilePath: string) => {
    console.log(
        `Converted map "${fullFilePath
            .slice(fullFilePath.lastIndexOf('/') + 1)
            .replace('.png', '')}"`
    )
}
