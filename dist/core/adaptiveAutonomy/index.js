// src/core/adaptiveAutonomy/index.ts
// BOWCON V4.0 — MS-1.5.12: NATIVE GOVERNED ADAPTIVE AUTONOMY, RECOVERY & SUPERVISED CONTINUOUS OPERATION ENGINE
// Component 1097 — REAL
//
// EN: Public barrel export interface for native governed adaptive autonomy, bounded recovery,
//     and continuous supervised execution. Guarantees strict external boundaries and zero direct execution primitive leakage.
// VI: Giao diện xuất thùng công khai cho tự chủ thích ứng có quản trị gốc, phục hồi có giới hạn,
//     và thực thi liên tục có giám sát. Bảo đảm ranh giới bên ngoài nghiêm ngặt và không rò rỉ nguyên thủy thực thi trực tiếp.
// 1. Constants & Budgets
export { ADAPTIVE_AUTONOMY_SCHEMA_VERSION, MAX_OPERATIONAL_CYCLES, MAX_RECOVERY_ATTEMPTS, MAX_ADAPTATION_ATTEMPTS, MAX_CONTINUITY_GENERATIONS, MAX_SESSION_DURATION_MS, MAX_CONSECUTIVE_FAILURES, MAX_CONSECUTIVE_DEGRADATIONS, } from './adaptiveAutonomyTypes.js';
// 2. Error Hierarchy
export { AdaptiveAutonomyError, AdaptiveAutonomyValidationError, AdaptiveAutonomyAuthorizationError, AdaptiveAutonomyTenantIsolationError, AdaptiveAutonomySessionIsolationError, AdaptiveAutonomyLeaseError, AdaptiveAutonomyBudgetError, AdaptiveAutonomyRecoveryError, AdaptiveAutonomyAdaptationError, AdaptiveAutonomyConcurrencyError, AdaptiveAutonomyUserStopError, AdaptiveAutonomyEmergencyStopError, AdaptiveAutonomyPersistenceError, AdaptiveAutonomyProvenanceError, AdaptiveAutonomyGovernanceError, } from './adaptiveAutonomyTypes.js';
// 3. Provenance & Cryptographic Functions
export { deterministicJsonStringify, computeSha256, computeAuthorizationEnvelopeProvenanceHash, computeHealthEvaluationHash, computeRecoveryAttemptHash, computeAdaptationDecisionHash, computeContinuitySnapshotHash, computeAdaptiveSessionProvenanceHash, } from './adaptiveAutonomyTypes.js';
// 4. Core Subsystem Components
export { AdaptiveAutonomyValidator } from './adaptiveAutonomyValidator.js';
export { SupervisionBudgetManager } from './supervisionBudgetManager.js';
export { OperationalHealthEvaluator } from './operationalHealthEvaluator.js';
export { GovernedRecoveryManager } from './governedRecoveryManager.js';
export { AdaptiveStrategyManager } from './adaptiveStrategyManager.js';
export { ContinuityIntegrityManager } from './continuityIntegrityManager.js';
export { AdaptiveAutonomySecurityBoundary, } from './adaptiveAutonomySecurityBoundary.js';
export { AdaptiveAutonomyAuditPersistenceBridge, } from './adaptiveAutonomyAuditPersistenceBridge.js';
export { GovernedAdaptiveAutonomyOrchestrator, } from './governedAdaptiveAutonomyOrchestrator.js';
