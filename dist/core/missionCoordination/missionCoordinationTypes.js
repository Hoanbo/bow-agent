// src/core/missionCoordination/missionCoordinationTypes.ts
// BOWCON V4.0 — MS-1.5.13: NATIVE GOVERNED MISSION COORDINATION, MULTI-OBJECTIVE PRIORITIZATION & SUPERVISED CONTINUATION ENGINE
// Component 1098 — REAL
//
// EN: Canonical contracts, mission lifecycle states, conflict taxonomy, error hierarchy,
//     and deterministic SHA-256 provenance functions for governed mission coordination.
// VI: Hợp đồng chính tắc, trạng thái vòng đời sứ mệnh, phân loại xung đột, hệ thống phân cấp lỗi,
//     và các hàm nguồn gốc SHA-256 xác định cho điều phối sứ mệnh có quản trị.
import { createHash } from 'node:crypto';
// ============================================================================
// CONSTANTS & HARD CEILINGS
// ============================================================================
export const MISSION_COORDINATION_SCHEMA_VERSION = '1.5.13';
/** Hard structural mission boundaries / Các giới hạn trần sứ mệnh cấu trúc cứng */
export const MAX_OBJECTIVES_PER_MISSION = 20;
export const MAX_ACTIVE_OBJECTIVE_SESSIONS = 3;
export const MAX_COORDINATION_CYCLES = 100;
export const MAX_REASSESSMENTS = 10;
export const MAX_MISSION_DURATION_MS = 86_400_000; // 24 hours
export const MAX_OBJECTIVE_RETRIES = 3;
export const MAX_CONSECUTIVE_MISSION_FAILURES = 3;
export const MAX_OBJECTIVE_DEPENDENCY_DEPTH = 10;
export const MAX_STARVATION_CYCLES = 5;
// ============================================================================
// GOVERNANCE ERROR TAXONOMY
// ============================================================================
export class MissionCoordinationError extends Error {
    code;
    tenantId;
    missionId;
    timestamp;
    constructor(message, code = 'MISSION_COORDINATION_ERROR', tenantId, missionId) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.tenantId = tenantId;
        this.missionId = missionId;
        this.timestamp = Date.now();
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
export class MissionCoordinationValidationError extends MissionCoordinationError {
    constructor(message, tenantId, missionId) {
        super(message, 'MISSION_COORDINATION_VALIDATION_ERROR', tenantId, missionId);
    }
}
export class MissionCoordinationAuthorizationError extends MissionCoordinationError {
    constructor(message, tenantId, missionId) {
        super(message, 'MISSION_COORDINATION_AUTHORIZATION_ERROR', tenantId, missionId);
    }
}
export class MissionCoordinationTenantIsolationError extends MissionCoordinationError {
    constructor(message, tenantId, missionId) {
        super(message, 'MISSION_COORDINATION_TENANT_ISOLATION_ERROR', tenantId, missionId);
    }
}
export class MissionCoordinationSessionIsolationError extends MissionCoordinationError {
    constructor(message, tenantId, missionId) {
        super(message, 'MISSION_COORDINATION_SESSION_ISOLATION_ERROR', tenantId, missionId);
    }
}
export class MissionCoordinationScopeViolationError extends MissionCoordinationError {
    constructor(message, tenantId, missionId) {
        super(message, 'MISSION_COORDINATION_SCOPE_VIOLATION_ERROR', tenantId, missionId);
    }
}
export class MissionCoordinationLeaseError extends MissionCoordinationError {
    constructor(message, tenantId, missionId) {
        super(message, 'MISSION_COORDINATION_LEASE_ERROR', tenantId, missionId);
    }
}
export class MissionCoordinationBudgetError extends MissionCoordinationError {
    constructor(message, tenantId, missionId) {
        super(message, 'MISSION_COORDINATION_BUDGET_ERROR', tenantId, missionId);
    }
}
export class MissionCoordinationDependencyError extends MissionCoordinationError {
    constructor(message, tenantId, missionId) {
        super(message, 'MISSION_COORDINATION_DEPENDENCY_ERROR', tenantId, missionId);
    }
}
export class MissionCoordinationConflictError extends MissionCoordinationError {
    constructor(message, tenantId, missionId) {
        super(message, 'MISSION_COORDINATION_CONFLICT_ERROR', tenantId, missionId);
    }
}
export class MissionCoordinationPriorityError extends MissionCoordinationError {
    constructor(message, tenantId, missionId) {
        super(message, 'MISSION_COORDINATION_PRIORITY_ERROR', tenantId, missionId);
    }
}
export class MissionCoordinationConcurrencyError extends MissionCoordinationError {
    constructor(message, tenantId, missionId) {
        super(message, 'MISSION_COORDINATION_CONCURRENCY_ERROR', tenantId, missionId);
    }
}
export class MissionCoordinationUserStopError extends MissionCoordinationError {
    constructor(message, tenantId, missionId) {
        super(message, 'MISSION_COORDINATION_USER_STOP_ERROR', tenantId, missionId);
    }
}
export class MissionCoordinationEmergencyStopError extends MissionCoordinationError {
    constructor(message, tenantId, missionId) {
        super(message, 'MISSION_COORDINATION_EMERGENCY_STOP_ERROR', tenantId, missionId);
    }
}
export class MissionCoordinationPersistenceError extends MissionCoordinationError {
    constructor(message, tenantId, missionId) {
        super(message, 'MISSION_COORDINATION_PERSISTENCE_ERROR', tenantId, missionId);
    }
}
export class MissionCoordinationProvenanceError extends MissionCoordinationError {
    constructor(message, tenantId, missionId) {
        super(message, 'MISSION_COORDINATION_PROVENANCE_ERROR', tenantId, missionId);
    }
}
export class MissionCoordinationGovernanceError extends MissionCoordinationError {
    constructor(message, tenantId, missionId) {
        super(message, 'MISSION_COORDINATION_GOVERNANCE_ERROR', tenantId, missionId);
    }
}
// ============================================================================
// DETERMINISTIC SHA-256 PROVENANCE HELPERS
// ============================================================================
export function deterministicJsonStringify(obj) {
    if (obj === null || typeof obj !== 'object') {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return '[' + obj.map((item) => deterministicJsonStringify(item)).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    const pairs = keys.map((key) => `${JSON.stringify(key)}:${deterministicJsonStringify(obj[key])}`);
    return '{' + pairs.join(',') + '}';
}
export function computeSha256(data) {
    return createHash('sha256').update(data, 'utf8').digest('hex');
}
export function computeMissionAuthorizationHash(envelope) {
    return computeSha256(deterministicJsonStringify(envelope));
}
export function computeObjectiveBindingHash(binding) {
    return computeSha256(deterministicJsonStringify(binding));
}
export function computeObjectiveSelectionHash(selection) {
    return computeSha256(deterministicJsonStringify(selection));
}
export function computeCoordinationCycleHash(cycleData) {
    return computeSha256(deterministicJsonStringify(cycleData));
}
export function computeMissionSnapshotHash(snapshot) {
    return computeSha256(deterministicJsonStringify(snapshot));
}
export function computeMissionProvenanceHash(mission) {
    return computeSha256(deterministicJsonStringify(mission));
}
export function computeMissionResultHash(result) {
    return computeSha256(deterministicJsonStringify(result));
}
export function computeMissionAuditHash(auditData) {
    return computeSha256(deterministicJsonStringify(auditData));
}
