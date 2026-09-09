import type { RecoveryPlan } from './supervisorTypes.js';
export interface RecoveryExecutionResult {
    readonly success: boolean;
    readonly planId: string;
    readonly executedSteps: number;
    readonly actualEffects: string[];
    readonly error?: string;
    readonly isDryRun?: boolean;
}
export declare class SupervisorExecutionEngine {
    executeRecovery(plan: RecoveryPlan, options?: {
        isDryRun?: boolean;
        authorizationToken?: any;
    }): Promise<RecoveryExecutionResult>;
    private executeStep;
}
export declare const globalSupervisorExecution: SupervisorExecutionEngine;
