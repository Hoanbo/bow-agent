// src/core/brain-service/brainServiceRequest.ts
// BOWCON V4.0 — MS-1.3.31: REAL BOWCON BRAIN SERVICE & CONTINUOUS RUNTIME
//
// Inbound Request Envelope Validation & Sanitization.
import { BrainServiceError } from './brainServiceFailure.js';
export function validateServiceRequest(envelope) {
    if (!envelope || typeof envelope !== 'object') {
        throw new BrainServiceError('BRAIN_SERVICE_INVALID_REQUEST', 'Request envelope must be a non-null object');
    }
    const req = envelope;
    if (typeof req.requestId !== 'string' || req.requestId.trim().length === 0) {
        throw new BrainServiceError('BRAIN_SERVICE_INVALID_REQUEST', 'Missing or invalid "requestId"');
    }
    if (typeof req.sessionId !== 'string' || req.sessionId.trim().length === 0) {
        throw new BrainServiceError('BRAIN_SERVICE_INVALID_REQUEST', 'Missing or invalid "sessionId"');
    }
    if (!req.deviceContext || typeof req.deviceContext !== 'object') {
        throw new BrainServiceError('BRAIN_SERVICE_INVALID_REQUEST', 'Missing or invalid "deviceContext"');
    }
    if (typeof req.deviceContext.deviceId !== 'string' || req.deviceContext.deviceId.trim().length === 0) {
        throw new BrainServiceError('BRAIN_SERVICE_INVALID_REQUEST', 'deviceContext missing valid "deviceId"');
    }
    if (!req.input || typeof req.input !== 'object') {
        throw new BrainServiceError('BRAIN_SERVICE_INVALID_REQUEST', 'Missing or invalid "input" in request envelope');
    }
    if (typeof req.input.userText !== 'string' || req.input.userText.trim().length === 0) {
        throw new BrainServiceError('BRAIN_SERVICE_INVALID_REQUEST', 'Input must contain non-empty "userText" string field');
    }
    // Check for malicious null bytes in all string properties
    const scanNull = (val, label) => {
        if (val.includes('\0')) {
            throw new BrainServiceError('BRAIN_SERVICE_INVALID_REQUEST', `Null byte detected in request field "${label}"`);
        }
    };
    scanNull(req.requestId, 'requestId');
    scanNull(req.sessionId, 'sessionId');
    scanNull(req.deviceContext.deviceId, 'deviceId');
    scanNull(req.input.userText, 'input.userText');
    return req;
}
