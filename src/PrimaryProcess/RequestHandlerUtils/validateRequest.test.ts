import assert from 'node:assert'
import type { IncomingMessage } from 'node:http'
import { describe, it } from 'node:test'
import { RequestHandlerError } from './RequestHandlerError'
import { validateRequest } from './validateRequest'

describe('validateRequest', () => {
    const baseUrl = 'http://www.example.com'
    const mockRequest = {
        url: '/?dashboardId=iMnYyBfSxmM&username=hendrik',
        method: 'GET',
        socket: {
            remoteAddress: baseUrl,
        },
        headers: {
            accept: '*/*',
            'content-type': '*/*',
        },
    } as IncomingMessage

    it('should return undefined for a valid request', () => {
        assert.deepEqual(validateRequest(mockRequest, baseUrl), undefined)
        // Also accept `application/json` in headers
        assert.deepEqual(
            validateRequest(
                {
                    ...mockRequest,
                    headers: {
                        ...mockRequest.headers,
                        accept: 'application/json',
                        'content-type': 'application/json',
                    },
                } as IncomingMessage,
                baseUrl
            ),
            undefined
        )
        // And empty headers
        assert.deepEqual(
            validateRequest(
                {
                    ...mockRequest,
                    headers: {},
                } as IncomingMessage,
                baseUrl
            ),
            undefined
        )
    })
    it('should throw an error for a request from a non-whitelisted URL', () => {
        assert.throws(
            () =>
                validateRequest(
                    {
                        ...mockRequest,
                        socket: {
                            ...mockRequest.socket,
                            remoteAddress: 'http://notvalid.com',
                        },
                    } as IncomingMessage,
                    baseUrl
                ),
            (error: unknown) => {
                assert(error instanceof RequestHandlerError)
                assert.strictEqual(error?.message, 'Request not allowed from this IP')
                return true
            }
        )
    })
    it('should throw an error for an invalid path', () => {
        assert.throws(
            () =>
                validateRequest(
                    { ...mockRequest, url: '/invalidUrl' } as IncomingMessage,
                    baseUrl
                ),
            (error: unknown) => {
                assert(error instanceof RequestHandlerError)
                assert.strictEqual(
                    error?.message,
                    'Invalid pathname "/invalidUrl", the only available path is "/"'
                )
                return true
            }
        )
    })
    it('should throw an error for an invalid method', () => {
        assert.throws(
            () =>
                validateRequest(
                    { ...mockRequest, method: 'PUT' } as IncomingMessage,
                    baseUrl
                ),
            (error: unknown) => {
                assert(error instanceof RequestHandlerError)
                assert.strictEqual(
                    error?.message,
                    'Only requests of type "GET" are allowed'
                )
                return true
            }
        )
    })
    it('should throw an error if the content-type header is invalid', () => {
        assert.throws(
            () =>
                validateRequest(
                    {
                        ...mockRequest,
                        headers: {
                            ...mockRequest.headers,
                            'content-type': 'text/plain',
                        },
                    } as IncomingMessage,
                    baseUrl
                ),
            (error: unknown) => {
                assert(error instanceof RequestHandlerError)
                assert.strictEqual(
                    error?.message,
                    '"content-type" request header must be "application/json" or "*/*"'
                )
                return true
            }
        )
    })
    it('should throw an error if the accept header is invalid', () => {
        assert.throws(
            () =>
                validateRequest(
                    {
                        ...mockRequest,
                        headers: {
                            ...mockRequest.headers,
                            accept: 'text/plain',
                        },
                    } as IncomingMessage,
                    baseUrl
                ),
            (error: unknown) => {
                assert(error instanceof RequestHandlerError)
                assert.strictEqual(
                    error?.message,
                    '"accept" request header must be "application/json" or "*/*"'
                )
                return true
            }
        )
    })
})
