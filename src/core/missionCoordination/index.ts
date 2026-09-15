// src/core/missionCoordination/index.ts
// BOWCON V4.0 — MS-1.5.13: NATIVE GOVERNED MISSION COORDINATION, MULTI-OBJECTIVE PRIORITIZATION & SUPERVISED CONTINUATION ENGINE
// Component 1107 — REAL
//
// EN: Public barrel export interface for native governed mission coordination, multi-objective prioritization,
//     and supervised continuation engine. Ensures strict external boundaries and zero direct execution primitive leakage.
// VI: Giao diện xuất thùng công khai cho điều phối sứ mệnh có quản trị gốc, ưu tiên đa mục tiêu,
//     và động cơ tiếp tục có giám sát. Đảm bảo ranh giới bên ngoài nghiêm ngặt và không rò rỉ nguyên thủy thực thi trực tiếp.

// 1. Constants & Budgets
export {
  MISSION_COORDINATION_SCHEMA_VERSION,
  MAX_OBJECTIVES_PER_MISSION,
  MAX_ACTIVE_OBJECTIVE_SESSIONS,
  MAX_COORDINATION_CYCLES,
  MAX_REASSESSMENTS,
  MAX_MISSION_DURATION_MS,
  MAX_OBJECTIVE_RETRIES,
  MAX_CONSECUTIVE_MISSION_FAILURES,
  MAX_OBJECTIVE_DEPENDENCY_DEPTH,
  MAX_STARVATION_CYCLES,
  type MissionState,
  type MissionObjectiveState,
  type MissionConflictCategory,
  type MissionRiskTier,
  type MissionBudgetSnapshot,
  type MissionAuthorizationEnvelope,
  type MissionObjectiveBinding,
  type MissionDependencyGraph,
  type MissionPriorityPolicy,
  type MissionConflict,
  type MissionReassessmentRecord,
  type MissionContinuitySnapshot,
  type GovernedMission,
  type MissionCoordinationResult,
} from './missionCoordinationTypes.js';

// 2. Error Hierarchy
export {
  MissionCoordinationError,
  MissionCoordinationValidationError,
  MissionCoordinationAuthorizationError,
  MissionCoordinationTenantIsolationError,
  MissionCoordinationSessionIsolationError,
  MissionCoordinationScopeViolationError,
  MissionCoordinationLeaseError,
  MissionCoordinationBudgetError,
  MissionCoordinationDependencyError,
  MissionCoordinationConflictError,
  MissionCoordinationPriorityError,
  MissionCoordinationConcurrencyError,
  MissionCoordinationUserStopError,
  MissionCoordinationEmergencyStopError,
  MissionCoordinationPersistenceError,
  MissionCoordinationProvenanceError,
  MissionCoordinationGovernanceError,
} from './missionCoordinationTypes.js';

// 3. Cryptographic Provenance Functions
export {
  deterministicJsonStringify,
  computeSha256,
  computeMissionAuthorizationHash,
  computeObjectiveBindingHash,
  computeObjectiveSelectionHash,
  computeCoordinationCycleHash,
  computeMissionSnapshotHash,
  computeMissionProvenanceHash,
  computeMissionResultHash,
  computeMissionAuditHash,
} from './missionCoordinationTypes.js';

// 4. Subsystem Components
export { MissionCoordinationValidator } from './missionCoordinationValidator.js';
export { MissionObjectiveScheduler } from './missionObjectiveScheduler.js';
export { MissionPriorityEngine, type PriorityEvaluationResult } from './missionPriorityEngine.js';
export { MissionConflictResolver } from './missionConflictResolver.js';
export { MissionContinuityManager } from './missionContinuityManager.js';
export {
  MissionGovernanceSecurityBoundary,
  type MissionCheckpoint,
  type SecurityBoundaryOptions as MissionSecurityBoundaryOptions,
} from './missionGovernanceSecurityBoundary.js';
export {
  MissionAuditPersistenceBridge,
  type MissionAuditEventType,
  type MissionAuditRecord,
  type PersistenceBridgeOptions as MissionPersistenceBridgeOptions,
} from './missionAuditPersistenceBridge.js';
export {
  GovernedMissionCoordinator,
  type MissionCoordinatorOptions,
  type ObjectiveDelegationExecutor,
} from './governedMissionCoordinator.js';
