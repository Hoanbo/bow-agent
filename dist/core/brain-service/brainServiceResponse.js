// src/core/brain-service/brainServiceResponse.ts
// BOWCON V4.0 — MS-1.3.31: REAL BOWCON BRAIN SERVICE & CONTINUOUS RUNTIME
//
// Outbound Response Envelope Builder & Serializer.
import { BrainServiceError } from './brainServiceFailure.js';
export function buildSuccessResponse(options) {
    return {
        requestId: options.requestId,
        sessionId: options.sessionId,
        success: true,
        result: options.result,
        health: options.health,
        queueStatus: options.queueStatus,
        durationMs: options.durationMs,
        timestamp: Date.now(),
        metadata: options.metadata,
    };
}
export function buildErrorResponse(options) {
    let code = 'BRAIN_SERVICE_EXECUTION_FAILED';
    let message = 'An unknown execution error occurred';
    let classification = 'RECOVERABLE';
    let recoverable = true;
    const err = options.error;
    if (err instanceof BrainServiceError) {
        code = err.code;
        message = err.message;
        classification = err.classification;
        recoverable = err.recoverable;
    }
    else if (err instanceof Error) {
        message = err.message;
    }
    return {
        requestId: options.requestId,
        sessionId: options.sessionId,
        success: false,
        error: {
            code,
            message,
            classification,
            recoverable,
            timestamp: Date.now(),
        },
        health: options.health,
        queueStatus: options.queueStatus,
        durationMs: options.durationMs,
        timestamp: Date.now(),
        metadata: options.metadata,
    };
}
export function serializeResponseJson(response) {
    return JSON.stringify(response);
}
