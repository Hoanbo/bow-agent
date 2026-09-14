// src/core/deliberation/deliberationTypes.ts
// BOWCON V4.0 — MS-1.5.05: NATIVE NEURO-SYMBOLIC DELIBERATION TYPES
// Component 1018 — REAL
//
// Invariants:
// COGNITION != AUTHORITY
// DELIBERATION != AUTHORIZATION
// DELIBERATION != EXECUTION
// HYPOTHESIS != FACT
// HYPOTHESIS != EVIDENCE
// EVIDENCE != PROOF
// VECTOR MATCH != TRUTH
// PRIORITY != AUTHORIZATION
// USER_STOP > ALL MUTATION
// LLM OUTPUT != AUTHORITATIVE STATE
// WORKING STATE != DURABLE TRUTH
// ZERO_DIRECT_TOOL_EXECUTION == TRUE
// FAIL_CLOSED_ON_CONTRADICTION == TRUE
// NO_RAW_CHAIN_OF_THOUGHT_PERSISTENCE == TRUE
import crypto from 'node:crypto';
export const DELIBERATION_SCHEMA_VERSION = 1;
export const DELIBERATION_BOUNDS = Object.freeze({
    MAX_DELIBERATION_SESSIONS_PER_TENANT: 50,
    MAX_HYPOTHESES_PER_SESSION: 20,
    MAX_EVIDENCE_PER_HYPOTHESIS: 30,
    MAX_CONSTRAINTS_PER_SESSION: 50,
    MAX_CONTRADICTIONS_PER_SESSION: 40,
    MAX_INFERENCE_DEPTH: 6,
    MAX_GRAPH_NODES: 100,
    MAX_GRAPH_EDGES: 200,
    MAX_SESSION_BYTES: 512 * 1024, // 512 KB
    MAX_DELIBERATION_TIME_MS: 10000,
    MAX_TITLE_LENGTH: 200,
    MAX_PREMISE_LENGTH: 2000,
});
// Canonical Scoring Weights
export const CANONICAL_DELIBERATION_WEIGHTS = Object.freeze({
    symbolicValidityWeight: 0.60,
    neuralPlausibilityWeight: 0.40,
    refutationPenaltyWeight: 0.50,
});
// ============================================================================
// 1. ERROR TAXONOMY
// ============================================================================
export class DeliberationError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(`[${code}] ${message}`);
        this.name = 'DeliberationError';
        this.code = code;
        this.details = details ? Object.freeze({ ...details }) : undefined;
    }
}
export class DeliberationValidationError extends DeliberationError {
    validationErrors;
    constructor(message, errors = [], details) {
        super('DELIBERATION_VALIDATION_ERROR', `${message}: ${errors.join('; ')}`, { errors, ...details });
        this.name = 'DeliberationValidationError';
        this.validationErrors = Object.freeze([...errors]);
    }
}
export class DeliberationTransitionError extends DeliberationError {
    constructor(fromStatus, toStatus, reason) {
        super('DELIBERATION_TRANSITION_ERROR', `Illegal deliberation lifecycle transition from '${fromStatus}' to '${toStatus}'${reason ? `: ${reason}` : ''}`, { fromStatus, toStatus, reason });
        this.name = 'DeliberationTransitionError';
    }
}
export class DeliberationConcurrencyError extends DeliberationError {
    expectedVersion;
    actualVersion;
    constructor(expectedVersion, actualVersion, details) {
        super('DELIBERATION_CONCURRENCY_ERROR', `Optimistic concurrency violation: expected sessionVersion ${expectedVersion} but found ${actualVersion}`, { expectedVersion, actualVersion, ...details });
        this.name = 'DeliberationConcurrencyError';
        this.expectedVersion = expectedVersion;
        this.actualVersion = actualVersion;
    }
}
export class CrossTenantDeliberationError extends DeliberationError {
    constructor(requestedTenant, activeTenant) {
        super('CROSS_TENANT_DELIBERATION_ERROR', `Security violation: cross-tenant access blocked between requested '${requestedTenant}' and active '${activeTenant}'`, { requestedTenant, activeTenant });
        this.name = 'CrossTenantDeliberationError';
    }
}
export class DeliberationUserStopError extends DeliberationError {
    constructor(checkpoint) {
        super('DELIBERATION_USER_STOP_ERROR', `Deliberation mutation preempted at checkpoint '${checkpoint}' because USER_STOP is active`, { checkpoint });
        this.name = 'DeliberationUserStopError';
    }
}
export class DeliberationCoTProhibitedError extends DeliberationError {
    constructor(message, details) {
        super('DELIBERATION_COT_PROHIBITED_ERROR', message, details);
        this.name = 'DeliberationCoTProhibitedError';
    }
}
export class DeliberationIntegrityError extends DeliberationError {
    constructor(message, details) {
        super('DELIBERATION_INTEGRITY_ERROR', message, details);
        this.name = 'DeliberationIntegrityError';
    }
}
export class DeliberationSecurityError extends DeliberationError {
    constructor(message, details) {
        super('DELIBERATION_SECURITY_ERROR', message, details);
        this.name = 'DeliberationSecurityError';
    }
}
export class DeliberationCapacityError extends DeliberationError {
    constructor(currentCount, maxCount, entityType = 'deliberation entities') {
        super('DELIBERATION_CAPACITY_ERROR', `Capacity exceeded for ${entityType}: current ${currentCount}, maximum allowed is ${maxCount}`, { currentCount, maxCount, entityType });
        this.name = 'DeliberationCapacityError';
    }
}
export class ContradictionError extends DeliberationError {
    category;
    constructor(category, message, details) {
        super('CONTRADICTION_ERROR', `Contradiction detected [${category}]: ${message}`, { category, ...details });
        this.name = 'ContradictionError';
        this.category = category;
    }
}
// ============================================================================
// 3. CANONICAL UTILITIES & SECURITY FUNCTIONS
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
export function isSafeDeliberationKey(key) {
    if (typeof key !== 'string')
        return false;
    const k = key.trim().toLowerCase();
    return k !== '__proto__' && k !== 'constructor' && k !== 'prototype';
}
export function assertNoDeliberationCoT(val, path = '') {
    if (val === null || val === undefined)
        return;
    if (typeof val === 'string') {
        const lower = val.toLowerCase();
        if (lower.includes('<thought>') ||
            lower.includes('</thought>') ||
            lower.includes('[internal deliberation]') ||
            lower.includes('[scratchpad]') ||
            lower.includes('internal reason') ||
            lower.includes('chainofthought') ||
            lower.includes('privatedeliberation')) {
            throw new DeliberationCoTProhibitedError(`Raw chain-of-thought tokens detected in text at '${path}'`, { path });
        }
        return;
    }
    if (Array.isArray(val)) {
        val.forEach((item, idx) => assertNoDeliberationCoT(item, `${path}[${idx}]`));
        return;
    }
    if (typeof val === 'object') {
        for (const key of Object.getOwnPropertyNames(val)) {
            if (!isSafeDeliberationKey(key)) {
                throw new DeliberationSecurityError(`Prototype pollution key detected: '${key}' at '${path}'`, { key, path });
            }
            const lowerKey = key.toLowerCase().replace(/[^a-z]/g, '');
            if (PROHIBITED_COT_KEYS.has(lowerKey)) {
                throw new DeliberationCoTProhibitedError(`Prohibited reasoning key detected at '${path}.${key}'`, { key, path });
            }
            assertNoDeliberationCoT(val[key], `${path}.${key}`);
        }
    }
}
/**
 * Computes deterministic hypothesis identifier.
 */
export function computeDeterministicHypothesisId(tenantId, sessionId, title, createdAt) {
    const hash = crypto
        .createHash('sha256')
        .update(`${tenantId}:${sessionId}:${title.trim().toLowerCase()}:${createdAt}`, 'utf8')
        .digest('hex')
        .slice(0, 16);
    return `hypo_${hash}`;
}
/**
 * Computes deterministic SHA-256 hash of a DeliberationHypothesis.
 */
export function computeHypothesisHash(hypo, previousHash = '0'.repeat(64)) {
    const material = {
        hypothesisId: hypo.hypothesisId,
        sessionId: hypo.sessionId,
        tenantId: hypo.tenantId,
        title: hypo.title,
        premise: hypo.premise,
        predictedOutcome: hypo.predictedOutcome,
        status: hypo.status,
        statusReason: hypo.statusReason ?? null,
        supportingEvidenceIds: [...hypo.supportingEvidenceIds].sort(),
        refutingEvidenceIds: [...hypo.refutingEvidenceIds].sort(),
        satisfiedConstraintIds: [...hypo.satisfiedConstraintIds].sort(),
        violatedConstraintIds: [...hypo.violatedConstraintIds].sort(),
        plausibilityScore: hypo.plausibilityScore,
        validityScore: hypo.validityScore,
        combinedConfidence: hypo.combinedConfidence,
        version: hypo.version,
        createdAt: hypo.createdAt,
        previousHash,
    };
    return crypto.createHash('sha256').update(JSON.stringify(material), 'utf8').digest('hex');
}
/**
 * Computes deterministic SHA-256 hash of an EvidenceBinding.
 */
export function computeEvidenceBindingHash(evidence) {
    const material = {
        evidenceId: evidence.evidenceId,
        tenantId: evidence.tenantId,
        sessionId: evidence.sessionId ?? null,
        sourceType: evidence.sourceType,
        sourceReferenceId: evidence.sourceReferenceId,
        statement: evidence.statement,
        confidence: evidence.confidence,
        isEmpiricallyVerified: evidence.isEmpiricallyVerified,
        boundAt: evidence.boundAt,
    };
    return crypto.createHash('sha256').update(JSON.stringify(material), 'utf8').digest('hex');
}
/**
 * Computes deterministic SHA-256 hash of a DeliberationResult.
 */
export function computeResultHash(result) {
    const material = {
        sessionId: result.sessionId,
        tenantId: result.tenantId,
        targetGoalId: result.targetGoalId ?? null,
        winningHypothesisId: result.winningHypothesisId,
        topHypothesisIds: result.topHypotheses.map((h) => h.hypothesisId),
        status: result.status,
        summaryRationale: result.summaryRationale,
        recommendedAction: result.recommendedAction ?? null,
        requiresHumanReview: result.requiresHumanReview,
        sessionVersion: result.sessionVersion,
        completedAt: result.completedAt,
    };
    return crypto.createHash('sha256').update(JSON.stringify(material), 'utf8').digest('hex');
}
/**
 * Computes deterministic provenance hash for the entire DeliberationSessionDocument.
 */
export function computeSessionProvenanceHash(doc) {
    const material = {
        schemaVersion: doc.schemaVersion,
        sessionId: doc.sessionId,
        tenantId: doc.tenantId,
        sessionVersion: doc.sessionVersion,
        status: doc.status,
        origin: doc.origin,
        targetGoalId: doc.targetGoalId ?? null,
        hypothesisHashes: doc.hypotheses.map((h) => `${h.hypothesisId}:${h.provenanceHash}`).sort(),
        evidenceHashes: doc.evidenceBindings.map((e) => `${e.evidenceId}:${e.provenanceHash}`).sort(),
        constraintIds: doc.constraints.map((c) => c.constraintId).sort(),
        contradictionIds: doc.contradictions.map((c) => c.contradictionId).sort(),
        resultHash: doc.result ? doc.result.provenanceHash : null,
        updatedAt: doc.updatedAt,
    };
    return crypto.createHash('sha256').update(JSON.stringify(material), 'utf8').digest('hex');
}
