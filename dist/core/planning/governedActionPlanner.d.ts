import type { AuditLedger } from '../auditLedger.js';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import type { AgentTaskRuntime } from '../taskLifecycle/agentTaskRuntime.js';
import type { AgentTaskStore } from '../taskLifecycle/agentTaskStore.js';
import { type GovernedCandidatePlan, type GovernedPlanningRequest, type GovernedPlanningResponse } from './governedPlanningTypes.js';
export interface GovernedActionPlannerOptions {
    readonly taskRuntime?: AgentTaskRuntime;
    readonly taskStore?: AgentTaskStore;
    readonly auditLedger?: AuditLedger;
    readonly sanitizer?: DiagnosisSanitizer;
    readonly isUserStopActive?: () => boolean;
    readonly deterministicTimestamp?: string;
}
/**
 * Master Governed Multi-Step Action Planner.
 * Transforms untrusted cognitive output into a structured, inert, governed candidate plan.
 */
export declare class GovernedActionPlanner {
    private readonly taskRuntime?;
    private readonly taskStore?;
    private readonly auditLedger;
    private readonly sanitizer;
    private readonly externalUserStopFn?;
    private readonly deterministicTimestamp?;
    private internalUserStop;
    constructor(options?: GovernedActionPlannerOptions);
    /**
     * Sets internal USER_STOP emergency state.
     */
    setUserStop(active: boolean): void;
    /**
     * Returns true if USER_STOP is currently active.
     */
    isUserStopActive(): boolean;
    /**
     * Primary entry point: Produces an inert GovernedCandidatePlan from a GovernedPlanningRequest.
     * Executes 4 synchronous USER_STOP gates and enforces strict tenant and task-version binding.
     */
    plan(request: GovernedPlanningRequest): Promise<GovernedPlanningResponse>;
    /**
     * Cryptographically verifies candidate plan provenance offline.
     */
    static verifyPlanProvenance(plan: GovernedCandidatePlan): boolean;
    static calculateProvenance(plan: Omit<GovernedCandidatePlan, 'provenanceHash'> & {
        provenanceHash?: string;
    }): string;
    private computeProvenanceHash;
    /**
     * Verifies task existence, tenant alignment, and task version freshness (read-only).
     */
    private verifyTaskBoundary;
    private calculateRiskSummary;
    private checkCancellation;
    private emitAudit;
}
