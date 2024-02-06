import { Steps, StepKind } from '../../types'

export function findStepValueByKind(steps: Steps, kind: StepKind): string {
    const step = steps.find((step) => !!step[kind])

    if (typeof step?.[kind] !== 'string') {
        throw new Error(`Could not find step of kind "${kind}`)
    }

    return step[kind]
}
