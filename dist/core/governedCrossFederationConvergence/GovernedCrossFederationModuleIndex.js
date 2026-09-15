// src/core/governedCrossFederationConvergence/GovernedCrossFederationModuleIndex.ts
// BOWCON V4.0 — MS-1.5.17: GOVERNED CROSS-FEDERATION STRATEGY, CONVERGENCE & POLICY META-GOVERNANCE ENGINE
// Component 1147 — REAL
//
// EN: Public barrel module export interface for Milestone MS-1.5.17.
// VI: Điểm xuất mô-đun công khai chính thức cho Milestone MS-1.5.17.
export { 
// Hard Ceilings & Bounds
MAX_ACTIVE_FEDERATIONS_PER_CONVERGENCE, MAX_STRATEGY_PROPOSALS_PER_CONVERGENCE, MAX_CONVERGENCE_ROUNDS, MAX_PARTICIPATING_AGENTS_TOTAL, MAX_INTER_FEDERATION_DEPENDENCY_DEPTH, MAX_CROSS_FEDERATION_STATE_SIZE, MAX_ACTIVE_CONVERGENCE_SESSIONS, MAX_CONVERGENCE_REASSESSMENTS, MAX_CONSECUTIVE_CONVERGENCE_FAILURES, MAX_CONVERGENCE_DURATION_MS, MAX_AUDIT_LOG_RECORDS_PER_SESSION, 
// Typed Errors
GovernedCrossFederationError, GovernedCrossFederationValidationError, GovernedCrossFederationTenantIsolationError, GovernedCrossFederationSessionIsolationError, GovernedCrossFederationAuthorizationError, GovernedCrossFederationLeaseError, GovernedCrossFederationBudgetError, GovernedCrossFederationLifecycleError, GovernedCrossFederationConflictError, GovernedCrossFederationPolicyError, GovernedCrossFederationConcurrencyError, GovernedCrossFederationUserStopError, GovernedCrossFederationEmergencyStopError, GovernedCrossFederationPersistenceError, GovernedCrossFederationContinuityError, 
// Provenance Functions
deterministicJsonStringify, computeSha256, computeCrossFederationStrategyHash, computeConvergenceProposalHash, computeConvergenceRoundHash, computeCrossReconciliationHash, computePolicyMetaEvaluationHash, computeConvergenceStateSnapshotHash, computeConvergenceResultHash, computeConvergenceAuditHash, } from './GovernedCrossFederationTypes.js';
export { CrossFederationRegistry, } from './CrossFederationRegistry.js';
export { GovernedConvergenceEngine, } from './GovernedConvergenceEngine.js';
export { CrossFederationStrategyEngine, } from './CrossFederationStrategyEngine.js';
export { CrossFederationReconciliationEngine, } from './CrossFederationReconciliationEngine.js';
export { CrossFederationConflictResolver, } from './CrossFederationConflictResolver.js';
export { PolicyMetaGovernanceEngine, } from './PolicyMetaGovernanceEngine.js';
export { CrossFederationSecurityBoundary, } from './CrossFederationSecurityBoundary.js';
export { CrossFederationContinuityPersistenceBridge, } from './CrossFederationContinuityPersistenceBridge.js';
