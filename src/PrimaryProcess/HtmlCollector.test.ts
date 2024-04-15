import assert from 'node:assert'
import { describe, it } from 'node:test'
import { HtmlCollector, MAX_CONVERSION_TIME } from './HtmlCollector'

/* This test does not aim to provide full test coverage for
 * the HtmlCollector class, since the bulk of the functionality
 * is verified implicitely by the cluster integration test.
 * We only test timeout-related logic here because it was not
 * feasible to add a test for that in the intergration test. */
describe('HtmlCollector - request timeout', () => {
    it('should call the `onConversionCallback` function when the timeout expires', (context) => {
        context.mock.timers.enable({ apis: ['setTimeout'] })
        const onConversionCallbackMock = context.mock.fn()
        new HtmlCollector([], onConversionCallbackMock)
        context.mock.timers.tick(MAX_CONVERSION_TIME + 10)
        assert.strictEqual(onConversionCallbackMock.mock.calls.length, 1)
    })
    it('should not call the `onConversionCallback` function if clearConversionTimeout is called before the timeout expires', (context) => {
        context.mock.timers.enable({ apis: ['setTimeout'] })
        const onConversionCallbackMock = context.mock.fn()
        const htmlCollector = new HtmlCollector([], onConversionCallbackMock)
        // 100ms before timeout
        context.mock.timers.tick(MAX_CONVERSION_TIME - 100)
        htmlCollector.clearConversionTimeout()
        // 100ms after timeout
        context.mock.timers.tick(200)
        assert.strictEqual(onConversionCallbackMock.mock.calls.length, 0)
    })
})
