import { GovernedAgent, GovernedDelegation } from './multiAgentFederationTypes.js';
import { FederationSecurityBoundary } from './federationSecurityBoundary.js';
import { DelegationConflictResolver } from './delegationConflictResolver.js';
import { AgentTrustGovernanceEngine } from './agentTrustGovernanceEngine.js';
export interface CreateDelegationParams {
    readonly delegationId: string;
    readonly parentAgent: GovernedAgent;
    readonly delegateAgent: GovernedAgent;
    readonly missionId: string;
    readonly objectiveId: string;
    readonly scope: readonly string[];
    readonly riskTier: GovernedDelegation['riskTier'];
    readonly expiresAt: number;
    readonly parentDepth?: number;
}
export declare class GovernedDelegationEngine {
    private readonly securityBoundary;
    private readonly conflictResolver;
    private readonly trustEngine;
    private readonly activeDelegations;
    constructor(options?: {
        readonly securityBoundary?: FederationSecurityBoundary;
        readonly conflictResolver?: DelegationConflictResolver;
        readonly trustEngine?: AgentTrustGovernanceEngine;
    });
    /**
     * EN: Creates and binds a new governed delegation from parent to delegate agent.
     * VI: Tạo và liên kết một ủy quyền có quản trị mới từ tác tử cha sang tác tử được ủy quyền.
     */
    createDelegation(params: CreateDelegationParams): GovernedDelegation;
    getDelegation(delegationId: string): GovernedDelegation | undefined;
    getActiveDelegations(): readonly GovernedDelegation[];
    /**
     * EN: Updates delegation status.
     * VI: Cập nhật trạng thái ủy quyền.
     */
    updateDelegationStatus(delegationId: string, newStatus: GovernedDelegation['status']): GovernedDelegation;
}
