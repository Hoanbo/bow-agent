import type { RecoveryPlan } from './supervisorTypes.js';
export interface SupervisorPolicyDecision {
    readonly allowed: boolean;
    readonly requiresHumanGate: boolean;
    readonly reason: string;
}
export declare class SupervisorRecoveryPolicy {
    evaluate(plan: RecoveryPlan, target?: string): SupervisorPolicyDecision;
}
export declare const globalSupervisorRecoveryPolicy: SupervisorRecoveryPolicy;
