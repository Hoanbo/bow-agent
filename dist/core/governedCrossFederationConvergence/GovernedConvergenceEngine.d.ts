import { type CrossFederationConvergenceState, type CrossFederationLifecycleStatus, type InterFederationDependency } from './GovernedCrossFederationTypes.js';
import { CrossFederationRegistry } from './CrossFederationRegistry.js';
import { CrossFederationStrategyEngine } from './CrossFederationStrategyEngine.js';
import { CrossFederationReconciliationEngine } from './CrossFederationReconciliationEngine.js';
import { CrossFederationConflictResolver } from './CrossFederationConflictResolver.js';
import { PolicyMetaGovernanceEngine } from './PolicyMetaGovernanceEngine.js';
import { CrossFederationSecurityBoundary } from './CrossFederationSecurityBoundary.js';
import { CrossFederationContinuityPersistenceBridge } from './CrossFederationContinuityPersistenceBridge.js';
export interface CreateConvergenceSessionParams {
    readonly stateId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly missionId: string;
    readonly objectiveId: string;
    readonly participatingFederationIds: readonly string[];
}
export declare class GovernedConvergenceEngine {
    private readonly states;
    private readonly activeSessionsByTenant;
    readonly registry: CrossFederationRegistry;
    readonly strategyEngine: CrossFederationStrategyEngine;
    readonly reconciliationEngine: CrossFederationReconciliationEngine;
    readonly conflictResolver: CrossFederationConflictResolver;
    readonly policyMetaEngine: PolicyMetaGovernanceEngine;
    readonly securityBoundary: CrossFederationSecurityBoundary;
    readonly persistenceBridge: CrossFederationContinuityPersistenceBridge;
    constructor(registry?: CrossFederationRegistry, strategyEngine?: CrossFederationStrategyEngine, reconciliationEngine?: CrossFederationReconciliationEngine, conflictResolver?: CrossFederationConflictResolver, policyMetaEngine?: PolicyMetaGovernanceEngine, securityBoundary?: CrossFederationSecurityBoundary, persistenceBridge?: CrossFederationContinuityPersistenceBridge);
    private validateTransition;
    createSession(params: CreateConvergenceSessionParams): CrossFederationConvergenceState;
    transitionState(sessionId: string, targetStatus: CrossFederationLifecycleStatus, expectedVersion: number): CrossFederationConvergenceState;
    executeConvergenceRound(sessionId: string, expectedVersion: number, dependencies?: readonly InterFederationDependency[]): CrossFederationConvergenceState;
    reassessConvergence(sessionId: string, expectedVersion: number): CrossFederationConvergenceState;
    getSession(sessionId: string): CrossFederationConvergenceState | undefined;
    clear(): void;
}
