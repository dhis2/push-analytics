import type { StepKind, Steps } from '../../types'

export function filterStepValuesByKind(
    steps: Steps,
    kind: StepKind
): Array<string> {
    const payloads = steps
        .filter((step) => !!step[kind])
        .map((step) => step[kind])

    if (payloads.length === 0) {
        throw new Error(`Could not find any steps of kind "${kind}"`)
    }
    return payloads
}
