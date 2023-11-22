export const createTimer = () => {
    const startTimestamp = Date.now()
    const getElapsedTime = () =>
        ((Date.now() - startTimestamp) / 1000).toFixed(2)
    return { getElapsedTime }
}
