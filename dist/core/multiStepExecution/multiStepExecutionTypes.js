// src/core/multiStepExecution/multiStepExecutionTypes.ts
// BOWCON V4.0 — MS-1.5.10: MULTI-STEP EXECUTION TYPES & PROVENANCE
// Component 1068 — REAL
//
// EN: Canonical type definitions, schemas, bounded constants, typed errors,
//     and deterministic SHA-256 provenance helpers for governed multi-step execution.
// VI: Định nghĩa kiểu dữ liệu chuẩn mực, cấu trúc lược đồ, hằng số giới hạn, lỗi định kiểu,
//     và các hàm trợ giúp provenance SHA-256 xác định cho việc thực thi nhiều bước có quản trị.
import crypto from 'node:crypto';
// ============================================================================
// BOUNDED CONSTANTS (HẰNG SỐ GIỚI HẠN)
// ============================================================================
export const MAX_EXECUTION_STEPS = 10;
export const MAX_REPLANNING_GENERATIONS = 10;
export const MAX_REPLANS_PER_SESSION = 10;
export const MULTI_STEP_EXECUTION_SCHEMA_VERSION = '4.0.0';
// ============================================================================
// TYPED ERROR HIERARCHY (HỆ THỐNG LỖI ĐỊNH KIỂU)
// ============================================================================
export class MultiStepExecutionError extends Error {
    constructor(message) {
        super(message);
        this.name = 'MultiStepExecutionError';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
export class MultiStepExecutionValidationError extends MultiStepExecutionError {
    constructor(message) {
        super(message);
        this.name = 'MultiStepExecutionValidationError';
    }
}
export class MultiStepExecutionAuthorizationError extends MultiStepExecutionError {
    constructor(message) {
        super(message);
        this.name = 'MultiStepExecutionAuthorizationError';
    }
}
export class MultiStepExecutionLeaseError extends MultiStepExecutionError {
    constructor(message) {
        super(message);
        this.name = 'MultiStepExecutionLeaseError';
    }
}
export class MultiStepExecutionDependencyError extends MultiStepExecutionError {
    constructor(message) {
        super(message);
        this.name = 'MultiStepExecutionDependencyError';
    }
}
export class MultiStepExecutionEnvironmentError extends MultiStepExecutionError {
    constructor(message) {
        super(message);
        this.name = 'MultiStepExecutionEnvironmentError';
    }
}
export class MultiStepExecutionReplanningError extends MultiStepExecutionError {
    constructor(message) {
        super(message);
        this.name = 'MultiStepExecutionReplanningError';
    }
}
export class MultiStepExecutionGenerationError extends MultiStepExecutionError {
    constructor(message) {
        super(message);
        this.name = 'MultiStepExecutionGenerationError';
    }
}
export class MultiStepExecutionTenantIsolationError extends MultiStepExecutionError {
    constructor(message) {
        super(message);
        this.name = 'MultiStepExecutionTenantIsolationError';
    }
}
export class MultiStepExecutionSessionIsolationError extends MultiStepExecutionError {
    constructor(message) {
        super(message);
        this.name = 'MultiStepExecutionSessionIsolationError';
    }
}
export class MultiStepExecutionConcurrencyError extends MultiStepExecutionError {
    constructor(message) {
        super(message);
        this.name = 'MultiStepExecutionConcurrencyError';
    }
}
export class MultiStepExecutionUserStopError extends MultiStepExecutionError {
    checkpoint;
    constructor(checkpoint) {
        super(`Execution preempted by USER_STOP at checkpoint: ${checkpoint}`);
        this.name = 'MultiStepExecutionUserStopError';
        this.checkpoint = checkpoint;
    }
}
export class MultiStepExecutionPersistenceError extends MultiStepExecutionError {
    constructor(message) {
        super(message);
        this.name = 'MultiStepExecutionPersistenceError';
    }
}
// ============================================================================
// CANONICAL DETERMINISTIC SHA-256 PROVENANCE HELPERS
// (CÁC HÀM TRỢ GIÚP PROVENANCE SHA-256 XÁC ĐỊNH)
// ============================================================================
export function deterministicJsonStringify(obj) {
    if (obj === null || typeof obj !== 'object') {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return `[${obj.map(deterministicJsonStringify).join(',')}]`;
    }
    const keys = Object.keys(obj).sort();
    const pairs = keys.map((k) => `${JSON.stringify(k)}:${deterministicJsonStringify(obj[k])}`);
    return `{${pairs.join(',')}}`;
}
export function computeSha256(data) {
    return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}
export function computeGenerationProvenanceHash(generation) {
    const payload = {
        generationId: generation.generationId,
        generationIndex: generation.generationIndex,
        tenantId: generation.tenantId,
        sessionId: generation.sessionId,
        taskId: generation.taskId,
        planId: generation.planId,
        planVersion: generation.planVersion,
        bindingSnapshotHash: generation.bindingSnapshot.provenanceHash,
        taskSnapshotId: generation.taskSnapshot.taskId,
        stepStates: generation.stepStates,
        status: generation.status,
        createdAt: generation.createdAt,
    };
    return computeSha256(deterministicJsonStringify(payload));
}
export function computeEnvironmentSnapshotProvenanceHash(snapshot) {
    const payload = {
        snapshotId: snapshot.snapshotId,
        tenantId: snapshot.tenantId,
        sessionId: snapshot.sessionId,
        generationId: snapshot.generationId,
        stepId: snapshot.stepId ?? '',
        screenStateHash: snapshot.screenStateHash ?? '',
        observedElements: snapshot.observedElements ?? [],
        systemPreconditions: snapshot.systemPreconditions,
        observedPreconditions: snapshot.observedPreconditions,
        timestamp: snapshot.timestamp,
    };
    return computeSha256(deterministicJsonStringify(payload));
}
export function computeStepCheckpointProvenanceHash(checkpoint) {
    const payload = {
        checkpointId: checkpoint.checkpointId,
        tenantId: checkpoint.tenantId,
        sessionId: checkpoint.sessionId,
        generationId: checkpoint.generationId,
        stepId: checkpoint.stepId,
        stepIndex: checkpoint.stepIndex,
        status: checkpoint.status,
        resultSummary: checkpoint.resultSummary ?? {},
        environmentSnapshotHash: checkpoint.environmentSnapshotHash,
        timestamp: checkpoint.timestamp,
    };
    return computeSha256(deterministicJsonStringify(payload));
}
export function computeReplanningRequestProvenanceHash(request) {
    const payload = {
        requestId: request.requestId,
        tenantId: request.tenantId,
        sessionId: request.sessionId,
        sourceGenerationId: request.sourceGenerationId,
        sourceGenerationIndex: request.sourceGenerationIndex,
        taskId: request.taskId,
        planId: request.planId,
        completedStepIds: request.completedStepIds,
        failedStepId: request.failedStepId ?? '',
        invalidatedStepIds: request.invalidatedStepIds,
        environmentSnapshotHash: request.environmentSnapshot.provenanceHash,
        reason: request.reason,
        affectedDependencies: request.affectedDependencies,
        remainingObjective: request.remainingObjective,
        timestamp: request.timestamp,
    };
    return computeSha256(deterministicJsonStringify(payload));
}
export function computeMultiStepSessionProvenanceHash(session) {
    const payload = {
        sessionId: session.sessionId,
        tenantId: session.tenantId,
        taskId: session.taskId,
        planId: session.planId,
        activeGenerationId: session.activeGenerationId,
        status: session.status,
        sessionVersion: session.sessionVersion,
        generationHashes: session.generations.map((g) => g.provenanceHash),
        checkpointHashes: session.checkpoints.map((c) => c.provenanceHash),
        createdAt: session.createdAt,
    };
    return computeSha256(deterministicJsonStringify(payload));
}
export function computeMultiStepResultProvenanceHash(result) {
    const payload = {
        sessionId: result.sessionId,
        tenantId: result.tenantId,
        taskId: result.taskId,
        status: result.status,
        totalSteps: result.totalSteps,
        completedSteps: result.completedSteps,
        failedSteps: result.failedSteps,
        replanningGenerations: result.replanningGenerations,
        stepResultHashes: result.stepResults.map((r) => r.provenanceHash),
        finalOutcome: result.finalOutcome,
        sessionVersion: result.sessionVersion,
        timestamp: result.timestamp,
    };
    return computeSha256(deterministicJsonStringify(payload));
}
export function computeSessionDocumentProvenanceHash(doc) {
    const payload = {
        schemaVersion: doc.schemaVersion,
        sessionHash: doc.session.provenanceRoot,
        activeGenerationHash: doc.activeGeneration?.provenanceHash ?? '',
        replanningRequestHashes: doc.replanningRequests.map((r) => r.provenanceHash),
        environmentSnapshotHashes: doc.environmentSnapshots.map((e) => e.provenanceHash),
        executionResultHashes: doc.executionResults.map((r) => r.provenanceHash),
        sessionVersion: doc.sessionVersion,
        updatedAt: doc.updatedAt,
    };
    return computeSha256(deterministicJsonStringify(payload));
}
