import { PolicyEvolutionProposal, PolicyEvolutionLifecycleStatus, DeliberationSessionState } from './GovernedStrategicPolicyEvolutionTypes.js';
export declare class StrategicPolicyEvolutionDeliberationEngine {
    private activeSessionsByTenant;
    private validTransitions;
    constructor();
    openSession(tenantId: string, sessionId: string): DeliberationSessionState;
    transitionState(proposal: PolicyEvolutionProposal, targetState: PolicyEvolutionLifecycleStatus, expectedVersion?: number, emergencyStopSignaled?: boolean, userStopSignaled?: boolean): PolicyEvolutionProposal;
    getSession(tenantId: string, sessionId: string): DeliberationSessionState | undefined;
    closeSession(tenantId: string, sessionId: string): void;
    clearTenant(tenantId: string): void;
    private getOrCreateTenantSessions;
}
