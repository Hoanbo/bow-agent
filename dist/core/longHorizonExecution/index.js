// src/core/longHorizonExecution/index.ts
// BOWCON V4.0 — MS-1.5.11: LONG-HORIZON EXECUTION SUBSYSTEM BARREL EXPORTS
// Component 1087 — REAL
//
// EN: Public barrel export interface for native governed long-horizon autonomous orchestration.
//     Guarantees strict external boundaries and zero direct execution primitive leakage.
// VI: Giao diện xuất thùng công khai cho điều phối tự chủ tầm nhìn dài có quản trị gốc.
//     Bảo đảm ranh giới bên ngoài nghiêm ngặt và không rò rỉ nguyên thủy thực thi trực tiếp.
// 1. Types & Constants
export { LONG_HORIZON_SCHEMA_VERSION, MAX_LONG_HORIZON_GENERATIONS, MAX_LONG_HORIZON_STEPS, MAX_REPLANNING_ATTEMPTS, MAX_EXECUTION_ATTEMPTS_PER_STEP, MAX_CONSECUTIVE_FAILURES, MAX_STAGNATION_CYCLES, MAX_OBJECTIVE_EXTENSIONS, MAX_PENDING_APPROVALS, MAX_WALL_CLOCK_MS, } from './longHorizonExecutionTypes.js';
// 2. Governance Error Taxonomy
export { LongHorizonExecutionError, LongHorizonValidationError, LongHorizonAuthorizationError, LongHorizonBudgetExhaustedError, LongHorizonStagnationError, LongHorizonGenerationError, LongHorizonTenantIsolationError, LongHorizonSessionIsolationError, LongHorizonUserStopError, LongHorizonConcurrencyError, LongHorizonPersistenceError, LongHorizonContinuityError, LongHorizonReplanningError, LongHorizonSecurityBoundaryError, LongHorizonGovernanceError, } from './longHorizonExecutionTypes.js';
// 3. Cryptographic Provenance Functions
export { computeObjectiveProvenanceHash, computeLongHorizonGenerationProvenanceHash, computeLongHorizonGenerationProvenanceHash as computeGenerationProvenanceHash, computeLongHorizonProgressProvenanceHash, computeLongHorizonProgressProvenanceHash as computeProgressProvenanceHash, computeLongHorizonSessionProvenanceHash, computeLongHorizonDocumentProvenanceHash, computeLongHorizonResultProvenanceHash, } from './longHorizonExecutionTypes.js';
// 4. Validator
export { LongHorizonExecutionValidator } from './longHorizonExecutionValidator.js';
// 5. Objective Progress Evaluator
export { ObjectiveProgressEvaluator, } from './objectiveProgressEvaluator.js';
// 6. Budget Manager
export { LongHorizonBudgetManager } from './longHorizonBudgetManager.js';
// 7. Continuity Manager
export { LongHorizonContinuityManager } from './longHorizonContinuityManager.js';
// 8. Security Boundary
export { LongHorizonAutonomySecurityBoundary, globalLongHorizonSecurityBoundary, } from './longHorizonAutonomySecurityBoundary.js';
// 9. Audit Bridge
export { LongHorizonAuditBridge, } from './longHorizonAuditBridge.js';
// 10. Persistence & Recovery Engine
export { LongHorizonPersistenceRecoveryEngine, } from './longHorizonPersistenceRecoveryEngine.js';
// 11. Master Governed Long-Horizon Orchestrator
export { GovernedLongHorizonOrchestrator, } from './governedLongHorizonOrchestrator.js';
