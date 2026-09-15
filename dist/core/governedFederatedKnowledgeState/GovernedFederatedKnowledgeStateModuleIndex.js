// src/core/governedFederatedKnowledgeState/GovernedFederatedKnowledgeStateModuleIndex.ts
// BOWCON V4.0 — MS-1.5.16: GOVERNED FEDERATED KNOWLEDGE STATE & COLLECTIVE INTELLIGENCE ENGINE
// Component 1137 — REAL
//
// EN: Public barrel module export interface for Milestone MS-1.5.16.
// VI: Điểm xuất mô-đun công khai chính thức cho Milestone MS-1.5.16.
export { 
// Hard Ceilings & Bounds
MAX_KNOWLEDGE_ENTRIES_PER_FEDERATION, MAX_KNOWLEDGE_ENTRIES_PER_AGENT, MAX_EVIDENCE_PER_KNOWLEDGE_ENTRY, MAX_LINEAGE_DEPTH, MAX_KNOWLEDGE_STATE_SIZE, MAX_MERGE_OPERATIONS_PER_STATE, MAX_RECONCILIATIONS_PER_STATE, MAX_ACTIVE_KNOWLEDGE_STATES, MAX_KNOWLEDGE_REASSESSMENTS, MAX_CONSECUTIVE_KNOWLEDGE_FAILURES, MAX_KNOWLEDGE_STATE_DURATION_MS, 
// Typed Errors
GovernedFederatedKnowledgeStateError, GovernedFederatedKnowledgeStateValidationError, GovernedFederatedKnowledgeStateTenantIsolationError, GovernedFederatedKnowledgeStateSessionIsolationError, GovernedFederatedKnowledgeStateAuthorizationError, GovernedFederatedKnowledgeStateLeaseError, GovernedFederatedKnowledgeStateBudgetError, GovernedFederatedKnowledgeStateConflictError, GovernedFederatedKnowledgeStateConcurrencyError, GovernedFederatedKnowledgeStateUserStopError, GovernedFederatedKnowledgeStateEmergencyStopError, GovernedFederatedKnowledgeStatePersistenceError, GovernedFederatedKnowledgeStateLineageError, GovernedFederatedKnowledgeStateContinuityError, 
// Provenance Functions
deterministicJsonStringify, computeSha256, computeKnowledgeEntryHash, computeKnowledgeEvidenceHash, computeKnowledgeLineageHash, computeKnowledgeMergeHash, computeKnowledgeReconciliationHash, computeKnowledgeStateSnapshotHash, computeKnowledgeResultHash, computeKnowledgeAuditHash, } from './GovernedFederatedKnowledgeStateTypes.js';
export { FederatedKnowledgeRegistry, } from './FederatedKnowledgeRegistry.js';
export { GovernedKnowledgeStateEngine, } from './GovernedKnowledgeStateEngine.js';
export { KnowledgeLineageEngine, } from './KnowledgeLineageEngine.js';
export { KnowledgeMergeReconciliationEngine, } from './KnowledgeMergeReconciliationEngine.js';
export { KnowledgeConflictResolver, } from './KnowledgeConflictResolver.js';
export { CollectiveIntelligenceGovernanceEngine, } from './CollectiveIntelligenceGovernanceEngine.js';
export { FederatedKnowledgeSecurityBoundary, } from './FederatedKnowledgeSecurityBoundary.js';
export { KnowledgeContinuityPersistenceBridge, } from './KnowledgeContinuityPersistenceBridge.js';
