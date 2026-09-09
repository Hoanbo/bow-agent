import type { ExecutiveTask } from './executiveTypes.js';
export interface ExecutiveGovernanceDecision {
    readonly permitted: boolean;
    readonly requiresHumanApproval: boolean;
    readonly riskLevel: string;
    readonly reason: string;
    readonly violations: string[];
}
export declare class ExecutiveGovernance {
    private _protectedPath;
    private _forbiddenExecutables;
    evaluate(task: ExecutiveTask): ExecutiveGovernanceDecision;
}
export declare const globalExecutiveGovernance: ExecutiveGovernance;
