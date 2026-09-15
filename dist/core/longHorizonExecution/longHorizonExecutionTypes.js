// src/core/longHorizonExecution/longHorizonExecutionTypes.ts
// BOWCON V4.0 — MS-1.5.11: LONG-HORIZON EXECUTION TYPES & CONTRACTS
// Component 1078 — REAL
//
// EN: Authoritative type definitions, lifecycle states, autonomy budget contracts,
//     provenance functions, and governance error taxonomy for long-horizon execution.
// VI: Định nghĩa kiểu có thẩm quyền, trạng thái vòng đời, hợp đồng ngân sách tự chủ,
//     hàm nguồn gốc và phân loại lỗi quản trị cho thực thi tầm nhìn dài.
import crypto from 'node:crypto';
// ============================================================================
// Centralized Hard Constraints & Safe Defaults
// ============================================================================
export const LONG_HORIZON_SCHEMA_VERSION = '4.0.0';
export const MAX_LONG_HORIZON_GENERATIONS = 10;
export const MAX_LONG_HORIZON_STEPS = 100;
export const MAX_REPLANNING_ATTEMPTS = 10;
export const MAX_EXECUTION_ATTEMPTS_PER_STEP = 3;
export const MAX_CONSECUTIVE_FAILURES = 3;
export const MAX_STAGNATION_CYCLES = 3;
export const MAX_OBJECTIVE_EXTENSIONS = 3;
export const MAX_PENDING_APPROVALS = 1;
export const MAX_WALL_CLOCK_MS = 60 * 60 * 1000; // 1 hour ceiling
// ============================================================================
// Governance Error Taxonomy
// ============================================================================
export class LongHorizonExecutionError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(`[LONG_HORIZON_${code}] ${message}`);
        this.name = this.constructor.name;
        this.code = code;
        this.details = details ? Object.freeze({ ...details }) : undefined;
    }
}
export class LongHorizonValidationError extends LongHorizonExecutionError {
    constructor(message, details) {
        super('VALIDATION_ERROR', message, details);
    }
}
export class LongHorizonAuthorizationError extends LongHorizonExecutionError {
    constructor(message, details) {
        super('AUTHORIZATION_ERROR', message, details);
    }
}
export class LongHorizonBudgetExhaustedError extends LongHorizonExecutionError {
    constructor(message, details) {
        super('BUDGET_EXHAUSTED', message, details);
    }
}
export class LongHorizonStagnationError extends LongHorizonExecutionError {
    constructor(message, details) {
        super('STAGNATION_ERROR', message, details);
    }
}
export class LongHorizonGenerationError extends LongHorizonExecutionError {
    constructor(message, details) {
        super('GENERATION_ERROR', message, details);
    }
}
export class LongHorizonTenantIsolationError extends LongHorizonExecutionError {
    constructor(expectedTenant, actualTenant) {
        super('TENANT_ISOLATION_VIOLATION', `Tenant breach: expected "${expectedTenant}", received "${actualTenant}"`, { expectedTenant, actualTenant });
    }
}
export class LongHorizonSessionIsolationError extends LongHorizonExecutionError {
    constructor(expectedSession, actualSession) {
        super('SESSION_ISOLATION_VIOLATION', `Session breach: expected "${expectedSession}", received "${actualSession}"`, { expectedSession, actualSession });
    }
}
export class LongHorizonUserStopError extends LongHorizonExecutionError {
    constructor(checkpoint) {
        super('USER_STOP_PREEMPTION', `Execution immediately halted by Master Human Authority USER_STOP at checkpoint: "${checkpoint}"`, { checkpoint });
    }
}
export class LongHorizonConcurrencyError extends LongHorizonExecutionError {
    constructor(message, details) {
        super('CONCURRENCY_ERROR', message, details);
    }
}
export class LongHorizonPersistenceError extends LongHorizonExecutionError {
    constructor(message, details) {
        super('PERSISTENCE_ERROR', message, details);
    }
}
export class LongHorizonContinuityError extends LongHorizonExecutionError {
    constructor(message, details) {
        super('CONTINUITY_ERROR', message, details);
    }
}
export class LongHorizonReplanningError extends LongHorizonExecutionError {
    constructor(message, details) {
        super('REPLANNING_ERROR', message, details);
    }
}
export class LongHorizonSecurityBoundaryError extends LongHorizonExecutionError {
    constructor(message, details) {
        super('SECURITY_BOUNDARY_ERROR', message, details);
    }
}
export { LongHorizonExecutionError as LongHorizonGovernanceError };
// ============================================================================
// Cryptographic Provenance Functions
// ============================================================================
export function computeObjectiveProvenanceHash(objective) {
    const canonical = JSON.stringify({
        objectiveId: objective.objectiveId,
        tenantId: objective.tenantId,
        sessionId: objective.sessionId,
        originatingTaskId: objective.originatingTaskId,
        sourcePlanProvenance: objective.sourcePlanProvenance,
        objectiveDescription: objective.objectiveDescription,
        objectiveConstraints: objective.objectiveConstraints,
        successCriteria: objective.successCriteria,
        failureCriteria: objective.failureCriteria,
        autonomyBudget: objective.autonomyBudget,
        authorizationScope: objective.authorizationScope,
        riskPolicy: objective.riskPolicy,
        createdAt: objective.createdAt,
        expiresAt: objective.expiresAt,
        version: objective.version,
    });
    return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}
export function computeLongHorizonGenerationProvenanceHash(gen) {
    const canonical = JSON.stringify({
        generationId: gen.generationId,
        parentGenerationId: gen.parentGenerationId,
        generationNumber: gen.generationNumber,
        objectiveId: gen.objectiveId,
        multiStepSessionId: gen.multiStepSessionId,
        planProvenance: gen.planProvenance,
        taskProvenance: gen.taskProvenance,
        authorizationProvenance: gen.authorizationProvenance,
        environmentProvenance: gen.environmentProvenance,
        leaseProvenance: gen.leaseProvenance,
        resultProvenance: gen.resultProvenance,
        status: gen.status,
        createdAt: gen.createdAt,
        supersededAt: gen.supersededAt,
        version: gen.version,
    });
    return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}
export function computeLongHorizonProgressProvenanceHash(rec) {
    const canonical = JSON.stringify({
        recordId: rec.recordId,
        objectiveId: rec.objectiveId,
        generationId: rec.generationId,
        completedSteps: rec.completedSteps,
        verifiedOutcomes: rec.verifiedOutcomes,
        environmentSnapshotProvenance: rec.environmentSnapshotProvenance,
        objectiveProgressState: rec.objectiveProgressState,
        progressScore: rec.progressScore,
        failureCount: rec.failureCount,
        stagnationCounter: rec.stagnationCounter,
        timestamp: rec.timestamp,
    });
    return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}
export function computeLongHorizonSessionProvenanceHash(session) {
    const canonical = JSON.stringify({
        horizonSessionId: session.horizonSessionId,
        tenantId: session.tenantId,
        sessionId: session.sessionId,
        objectiveHash: session.objective.provenanceHash,
        budget: session.budget,
        usage: session.usage,
        generations: session.generations.map((g) => g.provenanceHash),
        progressLedger: session.progressLedger.map((p) => p.provenanceHash),
        currentState: session.currentState,
        sessionVersion: session.sessionVersion,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
    });
    return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}
export function computeLongHorizonDocumentProvenanceHash(doc) {
    const canonical = JSON.stringify({
        schemaVersion: doc.schemaVersion,
        sessionHash: doc.session.provenanceHash,
        sessionVersion: doc.sessionVersion,
        updatedAt: doc.updatedAt,
    });
    return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}
export function computeLongHorizonResultProvenanceHash(res) {
    const canonical = JSON.stringify({
        horizonSessionId: res.horizonSessionId,
        tenantId: res.tenantId,
        sessionId: res.sessionId,
        objectiveId: res.objectiveId,
        finalState: res.finalState,
        progressSummary: res.progressSummary,
        usage: res.usage,
        completedAt: res.completedAt,
    });
    return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}
