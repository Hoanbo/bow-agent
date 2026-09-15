// src/core/multiAgentFederation/multiAgentFederationTypes.ts
// BOWCON V4.0 — MS-1.5.14: NATIVE GOVERNED MULTI-AGENT FEDERATION, DELEGATION & COLLABORATIVE COORDINATION ENGINE
// Component 1108 — REAL
//
// EN: Canonical contracts, multi-agent identity models, delegation envelopes, conflict taxonomy,
//     typed error hierarchy, and deterministic SHA-256 provenance functions for governed multi-agent federation.
// VI: Hợp đồng chính tắc, mô hình định danh đa tác tử, phong bì ủy quyền, phân loại xung đột,
//     hệ thống phân cấp lỗi và các hàm nguồn gốc SHA-256 xác định cho liên đoàn đa tác tử có quản trị.

import { createHash } from 'node:crypto';

// ============================================================================
// CONSTANTS & HARD CEILINGS / HẰNG SỐ VÀ CÁC GIỚI HẠN TRẦN CỨNG
// ============================================================================

export const MULTI_AGENT_FEDERATION_SCHEMA_VERSION = '1.5.14';

export const MAX_AGENTS_PER_FEDERATION = 8;
export const MAX_ACTIVE_FEDERATIONS = 3;
export const MAX_DELEGATION_DEPTH = 5;
export const MAX_DELEGATIONS_PER_FEDERATION = 20;
export const MAX_CAPABILITIES_PER_AGENT = 20;
export const MAX_DELEGATION_REASSESSMENTS = 10;
export const MAX_FEDERATION_COORDINATION_CYCLES = 100;
export const MAX_AGENT_RETRIES = 3;
export const MAX_CONSECUTIVE_FEDERATION_FAILURES = 3;
export const MAX_FEDERATION_DURATION_MS = 86_400_000; // 24 hours
export const MAX_MEMBERSHIP_CHANGES_PER_CYCLE = 8;

// ============================================================================
// LIFECYCLE & TAXONOMY / VÒNG ĐỜI VÀ PHÂN LOẠI
// ============================================================================

export type AgentStatus =
  | 'REGISTERING'
  | 'REGISTERED'
  | 'AUTHORIZED'
  | 'AVAILABLE'
  | 'BUSY'
  | 'DELEGATING'
  | 'SUSPENDED'
  | 'REVIEW_REQUIRED'
  | 'REVOKED'
  | 'HALTED_BY_USER_STOP'
  | 'HALTED_BY_EMERGENCY_STOP'
  | 'INVALIDATED';

export type FederationStatus =
  | 'INITIALIZING'
  | 'AUTHORIZED'
  | 'READY'
  | 'COORDINATING'
  | 'DELEGATION_ACTIVE'
  | 'DELEGATION_BLOCKED'
  | 'REVIEW_REQUIRED'
  | 'SUSPENDED'
  | 'RESUMABLE'
  | 'COMPLETED'
  | 'FAILED'
  | 'HALTED_BY_USER_STOP'
  | 'HALTED_BY_EMERGENCY_STOP'
  | 'INVALIDATED';

export type DelegationStatus =
  | 'INITIALIZING'
  | 'AUTHORIZED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'FAILED'
  | 'BLOCKED'
  | 'REVOKED'
  | 'EXPIRED'
  | 'CANCELLED';

export type DelegationConflictCategory =
  | 'NONE'
  | 'RESOURCE_CONFLICT'
  | 'SCOPE_CONFLICT'
  | 'AUTHORIZATION_CONFLICT'
  | 'LEASE_CONFLICT'
  | 'DEPENDENCY_CONFLICT'
  | 'AGENT_CONFLICT'
  | 'GENERATION_CONFLICT'
  | 'POLICY_CONFLICT';

export type FederationRiskTier = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type CapabilityType =
  | 'REASONING'
  | 'PLANNING'
  | 'COORDINATION'
  | 'SPECIALIZED_PROCESSING'
  | 'MONITORING'
  | 'VERIFICATION';

// ============================================================================
// DATA CONTRACTS / HỢP ĐỒNG DỮ LIỆU
// ============================================================================

export interface AgentTrustProfile {
  readonly identityScore: number; // [0, 1]
  readonly governanceComplianceScore: number; // [0, 1]
  readonly historicalSuccessRate: number; // [0, 1]
  readonly lastAssessedAt: number;
  readonly isTrustedForHighRisk: boolean;
  readonly trustFactors: Record<string, unknown>;
}

export interface AgentCapability {
  readonly capabilityId: string;
  readonly agentId: string;
  readonly capabilityType: CapabilityType;
  readonly scope: readonly string[];
  readonly riskTier: FederationRiskTier;
  readonly generation: number;
  readonly validFrom: number;
  readonly expiresAt: number;
  readonly provenanceHash: string;
}

export interface GovernedAgent {
  readonly agentId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly humanOperatorId: string;
  readonly agentType: string;
  readonly displayName: string;
  readonly status: AgentStatus;
  readonly capabilities: Record<string, AgentCapability>;
  readonly trustProfile: AgentTrustProfile;
  readonly authorizationBinding: {
    readonly envelopeId: string;
    readonly scope: readonly string[];
    readonly expiresAt: number;
  };
  readonly leaseBinding?: {
    readonly leaseId: string;
    readonly expiresAt: number;
  };
  readonly generation: number;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly provenanceHash: string;
}

export interface GovernedDelegation {
  readonly delegationId: string;
  readonly parentAgentId: string;
  readonly delegateAgentId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly missionId: string;
  readonly objectiveId: string;
  readonly scope: readonly string[];
  readonly authorizationBinding: {
    readonly envelopeId: string;
    readonly scope: readonly string[];
    readonly expiresAt: number;
  };
  readonly leaseBinding?: {
    readonly leaseId: string;
    readonly expiresAt: number;
  };
  readonly riskTier: FederationRiskTier;
  readonly generation: number;
  readonly depth: number;
  readonly expiresAt: number;
  readonly status: DelegationStatus;
  readonly provenanceHash: string;
}

export interface DelegationConflict {
  readonly conflictId: string;
  readonly category: DelegationConflictCategory;
  readonly primaryDelegationId: string;
  readonly conflictingDelegationId?: string;
  readonly description: string;
  readonly detectedAt: number;
  readonly isResolvable: boolean;
  readonly resolutionStrategy?: string;
}

export interface GovernedFederationGroup {
  readonly federationId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly missionId: string;
  readonly objectiveId: string;
  readonly participatingAgentIds: readonly string[];
  readonly leaderAgentId: string;
  readonly delegations: Record<string, GovernedDelegation>;
  readonly activeConflicts: readonly DelegationConflict[];
  readonly status: FederationStatus;
  readonly generation: number;
  readonly coordinationCyclesConsumed: number;
  readonly reassessmentsConsumed: number;
  readonly consecutiveFailures: number;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly provenanceHash: string;
}

export interface FederationContinuitySnapshot {
  readonly snapshotId: string;
  readonly federationId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly coordinationCycle: number;
  readonly federationStatus: FederationStatus;
  readonly participatingAgentIds: readonly string[];
  readonly leaderAgentId: string;
  readonly delegationIds: readonly string[];
  readonly activeConflicts: readonly DelegationConflict[];
  readonly generation: number;
  readonly environmentalFingerprint: string;
  readonly previousSnapshotHash: string;
  readonly currentSnapshotHash: string;
  readonly timestamp: number;
}

export interface FederationCoordinationResult {
  readonly federationId: string;
  readonly tenantId: string;
  readonly finalStatus: FederationStatus;
  readonly completedSuccessfully: boolean;
  readonly totalCyclesExecuted: number;
  readonly totalDelegationsCompleted: number;
  readonly totalDelegationsFailed: number;
  readonly finalSnapshotHash: string;
  readonly auditChainHeadHash: string;
  readonly summaryDetails: string;
}

// ============================================================================
// TYPED ERROR TAXONOMY / PHÂN LOẠI LỖI CÓ KIỂU DỮ LIỆU
// ============================================================================

export class MultiAgentFederationError extends Error {
  public readonly tenantId?: string;
  public readonly federationId?: string;
  public readonly agentId?: string;

  constructor(message: string, tenantId?: string, federationId?: string, agentId?: string) {
    super(message);
    this.name = this.constructor.name;
    this.tenantId = tenantId;
    this.federationId = federationId;
    this.agentId = agentId;
  }
}

export class MultiAgentFederationValidationError extends MultiAgentFederationError {}
export class MultiAgentFederationAuthorizationError extends MultiAgentFederationError {}
export class MultiAgentFederationTenantIsolationError extends MultiAgentFederationError {}
export class MultiAgentFederationSessionIsolationError extends MultiAgentFederationError {}
export class MultiAgentFederationScopeViolationError extends MultiAgentFederationError {}
export class MultiAgentFederationLeaseError extends MultiAgentFederationError {}
export class MultiAgentFederationBudgetError extends MultiAgentFederationError {}
export class MultiAgentFederationDelegationError extends MultiAgentFederationError {}
export class MultiAgentFederationConflictError extends MultiAgentFederationError {}
export class MultiAgentFederationTrustError extends MultiAgentFederationError {}
export class MultiAgentFederationConcurrencyError extends MultiAgentFederationError {}
export class MultiAgentFederationUserStopError extends MultiAgentFederationError {}
export class MultiAgentFederationEmergencyStopError extends MultiAgentFederationError {}
export class MultiAgentFederationPersistenceError extends MultiAgentFederationError {}
export class MultiAgentFederationProvenanceError extends MultiAgentFederationError {}
export class MultiAgentFederationContinuityError extends MultiAgentFederationError {}

// ============================================================================
// DETERMINISTIC SERIALIZATION & SHA-256 PROVENANCE HELPERS
// ============================================================================

export function computeSha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

export function deterministicJsonStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(deterministicJsonStringify).join(',') + ']';
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = keys.map(
    (k) => `${JSON.stringify(k)}:${deterministicJsonStringify((obj as Record<string, unknown>)[k])}`
  );
  return '{' + pairs.join(',') + '}';
}

export function computeAgentProvenanceHash(agent: Omit<GovernedAgent, 'provenanceHash'>): string {
  const canonical = deterministicJsonStringify({
    agentId: agent.agentId,
    tenantId: agent.tenantId,
    sessionId: agent.sessionId,
    humanOperatorId: agent.humanOperatorId,
    agentType: agent.agentType,
    status: agent.status,
    capabilities: Object.keys(agent.capabilities).sort(),
    authorizationBinding: agent.authorizationBinding,
    leaseBinding: agent.leaseBinding,
    generation: agent.generation,
    createdAt: agent.createdAt,
  });
  return computeSha256(`agent_provenance:${canonical}`);
}

export function computeAgentCapabilityHash(cap: Omit<AgentCapability, 'provenanceHash'>): string {
  const canonical = deterministicJsonStringify({
    capabilityId: cap.capabilityId,
    agentId: cap.agentId,
    capabilityType: cap.capabilityType,
    scope: [...cap.scope].sort(),
    riskTier: cap.riskTier,
    generation: cap.generation,
    validFrom: cap.validFrom,
    expiresAt: cap.expiresAt,
  });
  return computeSha256(`agent_capability:${canonical}`);
}

export function computeDelegationBindingHash(
  delegation: Omit<GovernedDelegation, 'provenanceHash'>
): string {
  const canonical = deterministicJsonStringify({
    delegationId: delegation.delegationId,
    parentAgentId: delegation.parentAgentId,
    delegateAgentId: delegation.delegateAgentId,
    tenantId: delegation.tenantId,
    sessionId: delegation.sessionId,
    missionId: delegation.missionId,
    objectiveId: delegation.objectiveId,
    scope: [...delegation.scope].sort(),
    authorizationBinding: delegation.authorizationBinding,
    leaseBinding: delegation.leaseBinding,
    riskTier: delegation.riskTier,
    generation: delegation.generation,
    depth: delegation.depth,
    expiresAt: delegation.expiresAt,
    status: delegation.status,
  });
  return computeSha256(`delegation_binding:${canonical}`);
}

export function computeDelegationChainHash(
  parentHash: string,
  delegationHash: string,
  depth: number
): string {
  return computeSha256(`delegation_chain:${parentHash}:${delegationHash}:depth_${depth}`);
}

export function computeFederationSnapshotHash(
  snapshot: Omit<FederationContinuitySnapshot, 'currentSnapshotHash'>
): string {
  const canonical = deterministicJsonStringify({
    snapshotId: snapshot.snapshotId,
    federationId: snapshot.federationId,
    tenantId: snapshot.tenantId,
    sessionId: snapshot.sessionId,
    coordinationCycle: snapshot.coordinationCycle,
    federationStatus: snapshot.federationStatus,
    participatingAgentIds: [...snapshot.participatingAgentIds].sort(),
    leaderAgentId: snapshot.leaderAgentId,
    delegationIds: [...snapshot.delegationIds].sort(),
    generation: snapshot.generation,
    environmentalFingerprint: snapshot.environmentalFingerprint,
    previousSnapshotHash: snapshot.previousSnapshotHash,
    timestamp: snapshot.timestamp,
  });
  return computeSha256(`federation_snapshot:${canonical}`);
}

export function computeFederationResultHash(result: FederationCoordinationResult): string {
  const canonical = deterministicJsonStringify({
    federationId: result.federationId,
    tenantId: result.tenantId,
    finalStatus: result.finalStatus,
    completedSuccessfully: result.completedSuccessfully,
    totalCyclesExecuted: result.totalCyclesExecuted,
    totalDelegationsCompleted: result.totalDelegationsCompleted,
    totalDelegationsFailed: result.totalDelegationsFailed,
    finalSnapshotHash: result.finalSnapshotHash,
    auditChainHeadHash: result.auditChainHeadHash,
  });
  return computeSha256(`federation_result:${canonical}`);
}

export function computeFederationAuditHash(
  previousHash: string,
  eventType: string,
  tenantId: string,
  timestamp: number,
  payload: Record<string, unknown>
): string {
  const canonicalPayload = deterministicJsonStringify(payload);
  return computeSha256(
    `federation_audit:${previousHash}:${eventType}:${tenantId}:${timestamp}:${canonicalPayload}`
  );
}
