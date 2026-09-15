// src/core/multiAgentFederation/index.ts
// BOWCON V4.0 — MS-1.5.14: NATIVE GOVERNED MULTI-AGENT FEDERATION, DELEGATION & COLLABORATIVE COORDINATION ENGINE
// Component 1117 — REAL
//
// EN: Public module barrel export for native governed multi-agent federation subsystem.
//     Guarantees strict encapsulation and zero direct execution primitive leakage.
// VI: Điểm xuất khẩu barrel mô-đun công khai cho hệ thống con liên đoàn đa tác tử có quản trị.
//     Đảm bảo tính đóng gói nghiêm ngặt và không rò rỉ nguyên thủy thực thi trực tiếp.

export {
  MULTI_AGENT_FEDERATION_SCHEMA_VERSION,
  MAX_AGENTS_PER_FEDERATION,
  MAX_ACTIVE_FEDERATIONS,
  MAX_DELEGATION_DEPTH,
  MAX_DELEGATIONS_PER_FEDERATION,
  MAX_CAPABILITIES_PER_AGENT,
  MAX_DELEGATION_REASSESSMENTS,
  MAX_FEDERATION_COORDINATION_CYCLES,
  MAX_AGENT_RETRIES,
  MAX_CONSECUTIVE_FEDERATION_FAILURES,
  MAX_FEDERATION_DURATION_MS,
  MAX_MEMBERSHIP_CHANGES_PER_CYCLE,
  type AgentStatus,
  type FederationStatus,
  type DelegationStatus,
  type DelegationConflictCategory,
  type FederationRiskTier,
  type CapabilityType,
  type AgentTrustProfile,
  type AgentCapability,
  type GovernedAgent,
  type GovernedDelegation,
  type DelegationConflict,
  type GovernedFederationGroup,
  type FederationContinuitySnapshot,
  type FederationCoordinationResult,
  MultiAgentFederationError,
  MultiAgentFederationValidationError,
  MultiAgentFederationAuthorizationError,
  MultiAgentFederationTenantIsolationError,
  MultiAgentFederationSessionIsolationError,
  MultiAgentFederationScopeViolationError,
  MultiAgentFederationLeaseError,
  MultiAgentFederationBudgetError,
  MultiAgentFederationDelegationError,
  MultiAgentFederationConflictError,
  MultiAgentFederationTrustError,
  MultiAgentFederationConcurrencyError,
  MultiAgentFederationUserStopError,
  MultiAgentFederationEmergencyStopError,
  MultiAgentFederationPersistenceError,
  MultiAgentFederationProvenanceError,
  MultiAgentFederationContinuityError,
  computeSha256,
  deterministicJsonStringify,
  computeAgentProvenanceHash,
  computeAgentCapabilityHash,
  computeDelegationBindingHash,
  computeDelegationChainHash,
  computeFederationSnapshotHash,
  computeFederationResultHash,
  computeFederationAuditHash,
} from './multiAgentFederationTypes.js';

export { MultiAgentIdentityRegistry } from './multiAgentIdentityRegistry.js';
export { AgentCapabilityRegistry } from './agentCapabilityRegistry.js';
export {
  FederationSecurityBoundary,
  type FederationCheckpoint,
  type SecurityBoundaryOptions,
} from './federationSecurityBoundary.js';
export {
  DelegationConflictResolver,
  type ConflictResolutionResult,
} from './delegationConflictResolver.js';
export {
  AgentTrustGovernanceEngine,
  type TrustEvaluationInput,
} from './agentTrustGovernanceEngine.js';
export {
  GovernedDelegationEngine,
  type CreateDelegationParams,
} from './governedDelegationEngine.js';
export {
  FederationContinuityPersistenceBridge,
  type FederationAuditEventType,
  type FederationAuditRecord,
} from './federationContinuityPersistenceBridge.js';
export {
  GovernedAgentFederation,
  type CreateFederationParams,
} from './governedAgentFederation.js';
