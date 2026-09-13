// src/core/cognitive/cognitiveTypes.ts
// BOWCON V4.0 — MS-1.3.32: REAL BOWCON COGNITIVE PROVIDER & LOCAL INTELLIGENCE RUNTIME
//
// Invariants:
// ONE_BRAIN == ONE_AUTHORITATIVE_BRAIN
// LLM_PROPOSE != EXECUTE
// CONFIDENCE != AUTHORIZATION
// HIGH_CONFIDENCE != EXECUTION_AUTHORITY
// COGNITIVE_PROVIDER != TOOL_REGISTRY
// FAILURE != BRAIN_DEATH
import { randomBytes } from 'node:crypto';
export const COGNITIVE_RUNTIME_VERSION = '4.0.0';
// ============================================================================
// MS-1.4.02 ERROR HIERARCHY
// ============================================================================
export class CognitiveRuntimeError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(`[${code}] ${message}`);
        this.name = 'CognitiveRuntimeError';
        this.code = code;
        this.details = details ? Object.freeze({ ...details }) : undefined;
    }
}
export class CognitiveBudgetExceededError extends CognitiveRuntimeError {
    budgetType;
    limit;
    actual;
    constructor(budgetType, limit, actual, details) {
        super('COGNITIVE_BUDGET_EXCEEDED', `Cognitive budget exceeded for '${budgetType}': limit=${limit}, actual=${actual}`, { budgetType, limit, actual, ...details });
        this.name = 'CognitiveBudgetExceededError';
        this.budgetType = budgetType;
        this.limit = limit;
        this.actual = actual;
    }
}
export class CognitiveTimeoutError extends CognitiveRuntimeError {
    timeoutMs;
    providerType;
    constructor(timeoutMs, providerType, details) {
        super('COGNITIVE_TIMEOUT', `Cognitive inference timed out after ${timeoutMs}ms${providerType ? ` on provider '${providerType}'` : ''}`, { timeoutMs, providerType, ...details });
        this.name = 'CognitiveTimeoutError';
        this.timeoutMs = timeoutMs;
        this.providerType = providerType;
    }
}
export class CognitiveProviderUnavailableError extends CognitiveRuntimeError {
    providerType;
    constructor(providerType, message, details) {
        super('COGNITIVE_PROVIDER_UNAVAILABLE', `Provider '${providerType}' is unavailable: ${message}`, { providerType, ...details });
        this.name = 'CognitiveProviderUnavailableError';
        this.providerType = providerType;
    }
}
export class CognitiveValidationError extends CognitiveRuntimeError {
    validationErrors;
    constructor(message, validationErrors = [], details) {
        super('COGNITIVE_VALIDATION_ERROR', `Cognitive result validation failed: ${message}`, { validationErrors, ...details });
        this.name = 'CognitiveValidationError';
        this.validationErrors = Object.freeze([...validationErrors]);
    }
}
export class CognitiveUserStopError extends CognitiveRuntimeError {
    constructor(operation, details) {
        super('COGNITIVE_USER_STOP_ACTIVE', `Cognitive operation '${operation}' aborted because USER_STOP is active`, { operation, ...details });
        this.name = 'CognitiveUserStopError';
    }
}
// ============================================================================
// DETERMINISTIC IDENTIFIER GENERATORS
// ============================================================================
export function makeCognitiveRequestId() {
    const rand = randomBytes(8).toString('hex');
    return `cogreq_${rand}`;
}
export function makeCognitiveTraceId() {
    const rand = randomBytes(8).toString('hex');
    return `cogtrc_${rand}`;
}
export function makeCognitivePlanId() {
    const rand = randomBytes(6).toString('hex');
    return `cogpln_${rand}`;
}
