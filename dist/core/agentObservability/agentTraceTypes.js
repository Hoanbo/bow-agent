// src/core/agentObservability/agentTraceTypes.ts
// BOWCON V4.0 — MS-1.4.11: AGENT TASK OBSERVABILITY & DISTRIBUTED TRACING
// Canonical Contracts, Taxonomies, Data Models & Error Hierarchy
/**
 * Hard Observability Ceilings (from MS-1.4.10)
 */
export const OBSERVABILITY_BOUNDS = {
    MAX_LOOP_ITERATIONS: 20,
    MAX_STEP_ATTEMPTS: 3,
    MAX_CONSECUTIVE_DENIALS: 3,
    MAX_TASK_EXECUTION_TIME_MS: 300000,
    MAX_SPANS_PER_TRACE: 500,
    MAX_EVENTS_PER_TRACE: 1000,
    MAX_PAYLOAD_SIZE_BYTES: 65536,
};
/**
 * Error Taxonomy for MS-1.4.11 Observability
 */
export class AgentObservabilityError extends Error {
    code;
    constructor(message, code = 'OBSERVABILITY_ERROR') {
        super(message);
        this.name = 'AgentObservabilityError';
        this.code = code;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
export class AgentObservabilityAbortedError extends AgentObservabilityError {
    reason;
    constructor(reason) {
        super(`Agent observability aborted: ${reason}`, 'OBSERVABILITY_ABORTED');
        this.name = 'AgentObservabilityAbortedError';
        this.reason = reason;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
export class AgentObservabilityValidationError extends AgentObservabilityError {
    constructor(message) {
        super(message, 'OBSERVABILITY_VALIDATION_ERROR');
        this.name = 'AgentObservabilityValidationError';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
export class AgentObservabilityConcurrencyError extends AgentObservabilityError {
    constructor(message) {
        super(message, 'OBSERVABILITY_CONCURRENCY_ERROR');
        this.name = 'AgentObservabilityConcurrencyError';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
export class AgentObservabilitySecurityError extends AgentObservabilityError {
    constructor(message) {
        super(message, 'OBSERVABILITY_SECURITY_ERROR');
        this.name = 'AgentObservabilitySecurityError';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
/**
 * Deeply freeze an object recursively to guarantee immutability
 */
export function deepFreeze(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            deepFreeze(obj[i]);
        }
    }
    else {
        for (const key of Object.keys(obj)) {
            const val = obj[key];
            if (val !== null && typeof val === 'object') {
                deepFreeze(val);
            }
        }
    }
    return Object.freeze(obj);
}
