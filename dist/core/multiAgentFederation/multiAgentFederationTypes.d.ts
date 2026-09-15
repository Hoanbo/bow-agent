export declare const MULTI_AGENT_FEDERATION_SCHEMA_VERSION = "1.5.14";
export declare const MAX_AGENTS_PER_FEDERATION = 8;
export declare const MAX_ACTIVE_FEDERATIONS = 3;
export declare const MAX_DELEGATION_DEPTH = 5;
export declare const MAX_DELEGATIONS_PER_FEDERATION = 20;
export declare const MAX_CAPABILITIES_PER_AGENT = 20;
export declare const MAX_DELEGATION_REASSESSMENTS = 10;
export declare const MAX_FEDERATION_COORDINATION_CYCLES = 100;
export declare const MAX_AGENT_RETRIES = 3;
export declare const MAX_CONSECUTIVE_FEDERATION_FAILURES = 3;
export declare const MAX_FEDERATION_DURATION_MS = 86400000;
export declare const MAX_MEMBERSHIP_CHANGES_PER_CYCLE = 8;
export type AgentStatus = 'REGISTERING' | 'REGISTERED' | 'AUTHORIZED' | 'AVAILABLE' | 'BUSY' | 'DELEGATING' | 'SUSPENDED' | 'REVIEW_REQUIRED' | 'REVOKED' | 'HALTED_BY_USER_STOP' | 'HALTED_BY_EMERGENCY_STOP' | 'INVALIDATED';
export type FederationStatus = 'INITIALIZING' | 'AUTHORIZED' | 'READY' | 'COORDINATING' | 'DELEGATION_ACTIVE' | 'DELEGATION_BLOCKED' | 'REVIEW_REQUIRED' | 'SUSPENDED' | 'RESUMABLE' | 'COMPLETED' | 'FAILED' | 'HALTED_BY_USER_STOP' | 'HALTED_BY_EMERGENCY_STOP' | 'INVALIDATED';
export type DelegationStatus = 'INITIALIZING' | 'AUTHORIZED' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'BLOCKED' | 'REVOKED' | 'EXPIRED' | 'CANCELLED';
export type DelegationConflictCategory = 'NONE' | 'RESOURCE_CONFLICT' | 'SCOPE_CONFLICT' | 'AUTHORIZATION_CONFLICT' | 'LEASE_CONFLICT' | 'DEPENDENCY_CONFLICT' | 'AGENT_CONFLICT' | 'GENERATION_CONFLICT' | 'POLICY_CONFLICT';
export type FederationRiskTier = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type CapabilityType = 'REASONING' | 'PLANNING' | 'COORDINATION' | 'SPECIALIZED_PROCESSING' | 'MONITORING' | 'VERIFICATION';
export interface AgentTrustProfile {
    readonly identityScore: number;
    readonly governanceComplianceScore: number;
    readonly historicalSuccessRate: number;
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
export declare class MultiAgentFederationError extends Error {
    readonly tenantId?: string;
    readonly federationId?: string;
    readonly agentId?: string;
    constructor(message: string, tenantId?: string, federationId?: string, agentId?: string);
}
export declare class MultiAgentFederationValidationError extends MultiAgentFederationError {
}
export declare class MultiAgentFederationAuthorizationError extends MultiAgentFederationError {
}
export declare class MultiAgentFederationTenantIsolationError extends MultiAgentFederationError {
}
export declare class MultiAgentFederationSessionIsolationError extends MultiAgentFederationError {
}
export declare class MultiAgentFederationScopeViolationError extends MultiAgentFederationError {
}
export declare class MultiAgentFederationLeaseError extends MultiAgentFederationError {
}
export declare class MultiAgentFederationBudgetError extends MultiAgentFederationError {
}
export declare class MultiAgentFederationDelegationError extends MultiAgentFederationError {
}
export declare class MultiAgentFederationConflictError extends MultiAgentFederationError {
}
export declare class MultiAgentFederationTrustError extends MultiAgentFederationError {
}
export declare class MultiAgentFederationConcurrencyError extends MultiAgentFederationError {
}
export declare class MultiAgentFederationUserStopError extends MultiAgentFederationError {
}
export declare class MultiAgentFederationEmergencyStopError extends MultiAgentFederationError {
}
export declare class MultiAgentFederationPersistenceError extends MultiAgentFederationError {
}
export declare class MultiAgentFederationProvenanceError extends MultiAgentFederationError {
}
export declare class MultiAgentFederationContinuityError extends MultiAgentFederationError {
}
export declare function computeSha256(content: string): string;
export declare function deterministicJsonStringify(obj: unknown): string;
export declare function computeAgentProvenanceHash(agent: Omit<GovernedAgent, 'provenanceHash'>): string;
export declare function computeAgentCapabilityHash(cap: Omit<AgentCapability, 'provenanceHash'>): string;
export declare function computeDelegationBindingHash(delegation: Omit<GovernedDelegation, 'provenanceHash'>): string;
export declare function computeDelegationChainHash(parentHash: string, delegationHash: string, depth: number): string;
export declare function computeFederationSnapshotHash(snapshot: Omit<FederationContinuitySnapshot, 'currentSnapshotHash'>): string;
export declare function computeFederationResultHash(result: FederationCoordinationResult): string;
export declare function computeFederationAuditHash(previousHash: string, eventType: string, tenantId: string, timestamp: number, payload: Record<string, unknown>): string;
