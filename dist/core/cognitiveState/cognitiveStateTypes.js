// src/core/cognitiveState/cognitiveStateTypes.ts
// BOWCON V4.0 — MS-1.5.02: PERSISTENT COGNITIVE STATE CONTRACTS & ERROR HIERARCHY
// Component 989 — REAL
//
// Invariants:
// COGNITION != AUTHORITY
// REASONING != AUTHORIZATION
// COGNITIVE_STATE != TASK_STATE
// WORKING_STATE != DURABLE_TRUTH
// NO_RAW_CHAIN_OF_THOUGHT_PERSISTENCE == TRUE
// FAIL_CLOSED_ON_MALFORMED_STATE == TRUE
// USER_STOP > ALL_COGNITIVE_MUTATION
import crypto from 'node:crypto';
export const COGNITIVE_STATE_SCHEMA_VERSION = 1;
export const MAX_COGNITIVE_STATE_BYTES = 512 * 1024; // 512 KB hard ceiling
export const MAX_RECENT_OBSERVATIONS = 10;
export const MAX_SECONDARY_ATTENTION_TARGETS = 3;
export const MAX_ATTENTION_STACK_DEPTH = 5;
export const GENESIS_PREVIOUS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
// ============================================================================
// 1. ERROR HIERARCHY
// ============================================================================
export class CognitiveStateError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(`[${code}] ${message}`);
        this.name = 'CognitiveStateError';
        this.code = code;
        this.details = details ? Object.freeze({ ...details }) : undefined;
    }
}
export class CognitiveStateValidationError extends CognitiveStateError {
    validationErrors;
    constructor(message, errors = [], details) {
        super('COGNITIVE_STATE_VALIDATION_ERROR', `${message}: ${errors.join('; ')}`, { errors, ...details });
        this.name = 'CognitiveStateValidationError';
        this.validationErrors = Object.freeze([...errors]);
    }
}
export class CognitiveStateConcurrencyError extends CognitiveStateError {
    expectedVersion;
    actualVersion;
    constructor(expectedVersion, actualVersion, details) {
        super('COGNITIVE_STATE_CONCURRENCY_ERROR', `Optimistic concurrency violation: expected stateVersion ${expectedVersion} but found ${actualVersion}`, { expectedVersion, actualVersion, ...details });
        this.name = 'CognitiveStateConcurrencyError';
        this.expectedVersion = expectedVersion;
        this.actualVersion = actualVersion;
    }
}
export class CognitiveStateSizeLimitError extends CognitiveStateError {
    byteLength;
    limitBytes;
    constructor(actualBytes, limitBytes = MAX_COGNITIVE_STATE_BYTES) {
        super('COGNITIVE_STATE_SIZE_LIMIT_ERROR', `Cognitive state partition size ${actualBytes} bytes exceeds maximum limit of ${limitBytes} bytes`, { actualBytes, limitBytes });
        this.name = 'CognitiveStateSizeLimitError';
        this.byteLength = actualBytes;
        this.limitBytes = limitBytes;
    }
}
export class CognitiveStateRecoveryError extends CognitiveStateError {
    constructor(message, details) {
        super('COGNITIVE_STATE_RECOVERY_ERROR', message, details);
        this.name = 'CognitiveStateRecoveryError';
    }
}
export class CognitiveStateIntegrityError extends CognitiveStateError {
    constructor(message, details) {
        super('COGNITIVE_STATE_INTEGRITY_ERROR', message, details);
        this.name = 'CognitiveStateIntegrityError';
    }
}
export class CrossTenantCognitiveStateError extends CognitiveStateError {
    constructor(requestedTenant, activeTenant) {
        super('CROSS_TENANT_COGNITIVE_STATE_ERROR', `Unauthorized cross-tenant access: tenant '${activeTenant}' attempted to access state of '${requestedTenant}'`, { requestedTenant, activeTenant });
        this.name = 'CrossTenantCognitiveStateError';
    }
}
export class CognitiveStateUserStopError extends CognitiveStateError {
    constructor(checkpoint) {
        super('COGNITIVE_STATE_USER_STOP_ACTIVE', `Cognitive state mutation blocked at checkpoint '${checkpoint}' because USER_STOP is active`, { checkpoint });
        this.name = 'CognitiveStateUserStopError';
    }
}
export class CognitiveStateTransitionError extends CognitiveStateError {
    constructor(fromState, toState, reason) {
        super('COGNITIVE_STATE_TRANSITION_ERROR', `Illegal cognitive lifecycle transition from '${fromState}' to '${toState}'${reason ? `: ${reason}` : ''}`, { fromState, toState, reason });
        this.name = 'CognitiveStateTransitionError';
    }
}
export class CognitiveStatePromotionError extends CognitiveStateError {
    constructor(message, details) {
        super('COGNITIVE_STATE_PROMOTION_ERROR', message, details);
        this.name = 'CognitiveStatePromotionError';
    }
}
export const LEGAL_LIFECYCLE_TRANSITIONS = {
    UNINITIALIZED: ['INITIALIZING', 'RECOVERING', 'CLOSED'],
    INITIALIZING: ['ACTIVE', 'SUSPENDED', 'CLOSED'],
    ACTIVE: ['INTERRUPTED', 'SUSPENDED', 'CLOSED'],
    INTERRUPTED: ['ACTIVE', 'SUSPENDED', 'CLOSED'],
    SUSPENDED: ['RECOVERING', 'ACTIVE', 'CLOSED'],
    RECOVERING: ['ACTIVE', 'SUSPENDED', 'CLOSED'],
    CLOSED: ['INITIALIZING', 'RECOVERING'],
};
// ============================================================================
// 6. CANONICALIZATION & PROVENANCE UTILITIES
// ============================================================================
const PROHIBITED_COT_KEYS = new Set([
    'internalreasoning',
    'chainofthought',
    'scratchpad',
    'scratchpadtokens',
    'privatedeliberation',
    'hiddenthoughts',
    'thoughtlog',
    'internalmonologue',
    'modelthinking',
]);
/**
 * Recursively canonicalizes an arbitrary object/array ensuring deterministic key sorting
 * and detecting prohibited chain-of-thought keys.
 */
export function canonicalizeStateValue(val, path = '') {
    if (val === null || typeof val !== 'object') {
        return val;
    }
    if (Array.isArray(val)) {
        return val.map((item, idx) => canonicalizeStateValue(item, `${path}[${idx}]`));
    }
    const sortedObj = {};
    const keys = Object.keys(val).sort();
    for (const key of keys) {
        const lowerKey = key.toLowerCase().replace(/[^a-z]/g, '');
        if (PROHIBITED_COT_KEYS.has(lowerKey)) {
            throw new CognitiveStateValidationError('Raw chain-of-thought persistence is prohibited', [
                `Prohibited reasoning key detected at '${path}.${key}'`,
            ]);
        }
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            throw new CognitiveStateValidationError('Prototype pollution key detected', [
                `Illegal key '${key}' at '${path}'`,
            ]);
        }
        const child = val[key];
        if (typeof child !== 'function' && typeof child !== 'symbol') {
            sortedObj[key] = canonicalizeStateValue(child, `${path}.${key}`);
        }
    }
    return sortedObj;
}
/**
 * Produces deterministic JSON string from canonical state document without volatile fields.
 */
export function serializeCanonicalState(doc) {
    // Exclude volatile self-referencing stateHash from payload being hashed
    const material = {
        schemaVersion: doc.schemaVersion,
        tenantId: doc.tenantId,
        sessionId: doc.sessionId,
        stateVersion: doc.stateVersion,
        lifecycleState: doc.lifecycleState,
        registers: doc.registers,
        attention: doc.attention,
        previousStateHash: doc.provenance.previousStateHash,
        mutatedBy: doc.provenance.mutatedBy,
        mutationReason: doc.provenance.mutationReason,
        timestamp: doc.provenance.timestamp,
    };
    const canonicalObj = canonicalizeStateValue(material);
    return JSON.stringify(canonicalObj);
}
/**
 * Computes SHA-256 provenance hash for a cognitive state document.
 */
export function computeCognitiveStateHash(doc) {
    const serialized = serializeCanonicalState(doc);
    return crypto.createHash('sha256').update(serialized, 'utf8').digest('hex');
}
