// src/core/brain-service/brainServiceFailure.ts
// BOWCON V4.0 — MS-1.3.31: REAL BOWCON BRAIN SERVICE & CONTINUOUS RUNTIME
//
// Strongly-typed Error Hierarchy and Failure Classification Engine.
export class BrainServiceError extends Error {
    code;
    classification;
    recoverable;
    timestamp;
    details;
    constructor(code, message, classification = 'RECOVERABLE', details) {
        super(`[${code}] ${message}`);
        this.name = 'BrainServiceError';
        this.code = code;
        this.classification = classification;
        this.recoverable = classification === 'RECOVERABLE';
        this.timestamp = Date.now();
        this.details = details;
    }
}
export function classifyServiceError(err) {
    if (err instanceof BrainServiceError) {
        return err.classification;
    }
    if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        if (msg.includes('fatal') ||
            msg.includes('unrecoverable') ||
            msg.includes('corruption') ||
            msg.includes('out of memory')) {
            return 'FATAL';
        }
        if (msg.includes('timeout') || msg.includes('busy') || msg.includes('degraded')) {
            return 'DEGRADED';
        }
    }
    return 'RECOVERABLE';
}
export function isFatalServiceError(err) {
    return classifyServiceError(err) === 'FATAL';
}
