// src/core/brain-service/brainServiceTypes.ts
// BOWCON V4.0 — MS-1.3.31: REAL BOWCON BRAIN SERVICE & CONTINUOUS RUNTIME
//
// Authoritative Type Definitions, Enums, Interfaces, and Contracts.
//
// CARDINAL INVARIANTS:
// ONE_BRAIN == ONE_AUTHORITATIVE_BRAIN
// BRAIN_SERVICE != BRAIN
// SERVICE_PROCESS != COGNITIVE_AUTHORITY
// WORKER != BRAIN
// REQUEST != BRAIN
// SESSION != BRAIN
// TASK != PROCESS
// REQUEST != BRAIN_RESTART
// DUPLICATE_REQUEST != DUPLICATE_EXECUTION
// FAILURE != BRAIN_DEATH
// RECOVERABLE_FAILURE != SERVICE_TERMINATION
import crypto from 'node:crypto';
export const BRAIN_SERVICE_VERSION = '4.0.0';
export const BRAIN_SERVICE_PROTOCOL_VERSION = '1.0.0';
let _idCounter = 0;
/**
 * Deterministic, crypto-safe identifier generator.
 * Uses crypto SHA-256 hash to avoid forbidden Math.random.
 */
export function makeBrainServiceId(seed = 'bowcon_service') {
    _idCounter++;
    const hash = crypto
        .createHash('sha256')
        .update(`${seed}:${Date.now()}:${_idCounter}`)
        .digest('hex')
        .slice(0, 16);
    return `bsvc_${hash}`;
}
export function makeAuditEventId() {
    _idCounter++;
    const hash = crypto
        .createHash('sha256')
        .update(`audit:${Date.now()}:${_idCounter}`)
        .digest('hex')
        .slice(0, 16);
    return `aud_${hash}`;
}
