// src/core/federatedCollaborationMemory/index.ts
// BOWCON V4.0 — MS-1.5.15: NATIVE GOVERNED FEDERATED COLLABORATION MEMORY, SHARED CONTEXT & CONSENSUS GOVERNANCE ENGINE
// Component 1127 — REAL
//
// EN: Public barrel export for Milestone MS-1.5.15 subsystem.
// VI: Điểm xuất công khai cho toàn bộ hệ thống con Milestone MS-1.5.15.
export { 
// Constants
MAX_CONSENSUS_PARTICIPANTS, MAX_ACTIVE_CONSENSUS_SESSIONS, MAX_CONSENSUS_ROUNDS, MAX_CONSENSUS_PROPOSALS, MAX_CONSENSUS_DURATION_MS, MAX_CONSENSUS_REASSESSMENTS, MAX_CONSECUTIVE_CONSENSUS_FAILURES, MAX_MEMORY_ENTRIES_PER_FEDERATION, MAX_MEMORY_ENTRIES_PER_AGENT, MAX_CONTEXT_SIZE, MAX_OBSERVATIONS_PER_CONSENSUS, MAX_PROPOSALS_PER_CONTEXT, 
// Typed Errors
FederatedCollaborationMemoryError, FederatedCollaborationMemoryValidationError, FederatedCollaborationMemoryTenantIsolationError, FederatedCollaborationMemorySessionIsolationError, FederatedCollaborationMemoryAuthorizationError, FederatedCollaborationMemoryLeaseError, FederatedCollaborationMemoryBudgetError, FederatedCollaborationMemoryConflictError, FederatedCollaborationMemoryTrustError, FederatedCollaborationMemoryConcurrencyError, FederatedCollaborationMemoryUserStopError, FederatedCollaborationMemoryEmergencyStopError, FederatedCollaborationMemoryPersistenceError, FederatedCollaborationMemoryProvenanceError, FederatedCollaborationMemoryContinuityError, 
// Deterministic Provenance Functions
deterministicJsonStringify, computeSha256, computeCollaborationContextHash, computeMemoryEntryHash, computeObservationHash, computeObservationReconciliationHash, computeConsensusProposalHash, computeConsensusResultHash, computeCollaborationSnapshotHash, computeCollaborationAuditHash, } from './federatedCollaborationMemoryTypes.js';
export { CollaborationContextRegistry, } from './collaborationContextRegistry.js';
export { GovernedSharedContextEngine, } from './governedSharedContextEngine.js';
export { CollaborationMemoryEngine, } from './collaborationMemoryEngine.js';
export { AgentObservationReconciliationEngine, } from './agentObservationReconciliationEngine.js';
export { FederatedConsensusEngine, } from './federatedConsensusEngine.js';
export { ConsensusConflictResolver, } from './consensusConflictResolver.js';
export { CollaborationMemorySecurityBoundary, } from './collaborationMemorySecurityBoundary.js';
export { CollaborationContinuityPersistenceBridge, } from './collaborationContinuityPersistenceBridge.js';
