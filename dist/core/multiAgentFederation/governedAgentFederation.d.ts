import { GovernedFederationGroup, GovernedDelegation, FederationCoordinationResult } from './multiAgentFederationTypes.js';
import { MultiAgentIdentityRegistry } from './multiAgentIdentityRegistry.js';
import { AgentCapabilityRegistry } from './agentCapabilityRegistry.js';
import { GovernedDelegationEngine } from './governedDelegationEngine.js';
import { DelegationConflictResolver } from './delegationConflictResolver.js';
import { FederationSecurityBoundary } from './federationSecurityBoundary.js';
import { FederationContinuityPersistenceBridge } from './federationContinuityPersistenceBridge.js';
import { AgentTrustGovernanceEngine } from './agentTrustGovernanceEngine.js';
export interface CreateFederationParams {
    readonly federationId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly missionId: string;
    readonly objectiveId: string;
    readonly initialAgentIds: readonly string[];
    readonly leaderAgentId: string;
}
export declare class GovernedAgentFederation {
    private readonly identityRegistry;
    private readonly capabilityRegistry;
    private readonly delegationEngine;
    private readonly conflictResolver;
    private readonly securityBoundary;
    private readonly persistenceBridge;
    private readonly trustEngine;
    private readonly federations;
    constructor(options?: {
        readonly identityRegistry?: MultiAgentIdentityRegistry;
        readonly capabilityRegistry?: AgentCapabilityRegistry;
        readonly delegationEngine?: GovernedDelegationEngine;
        readonly conflictResolver?: DelegationConflictResolver;
        readonly securityBoundary?: FederationSecurityBoundary;
        readonly persistenceBridge?: FederationContinuityPersistenceBridge;
        readonly trustEngine?: AgentTrustGovernanceEngine;
    });
    getIdentityRegistry(): MultiAgentIdentityRegistry;
    getCapabilityRegistry(): AgentCapabilityRegistry;
    getDelegationEngine(): GovernedDelegationEngine;
    getSecurityBoundary(): FederationSecurityBoundary;
    getPersistenceBridge(): FederationContinuityPersistenceBridge;
    /**
     * EN: Creates and initializes a governed multi-agent federation group.
     * VI: Tạo và khởi tạo một nhóm liên đoàn đa tác tử có quản trị.
     */
    createFederation(params: CreateFederationParams): GovernedFederationGroup;
    /**
     * EN: Coordinates multi-agent federation for bounded cycles.
     * VI: Điều phối liên đoàn đa tác tử trong các chu kỳ có giới hạn.
     */
    coordinateFederation(federationId: string, cyclesToRun?: number, delegationExecutor?: (delegation: GovernedDelegation) => Promise<{
        success: boolean;
        error?: string;
    }>): Promise<FederationCoordinationResult>;
}
