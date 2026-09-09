import type { RecoveryPlan, Diagnosis } from './supervisorTypes.js';
export interface RecoveryVerificationOutcome {
    readonly verified: boolean;
    readonly checksPerformed: string[];
    readonly failureReason?: string;
}
export declare class SupervisorVerifier {
    verifyRecovery(plan: RecoveryPlan, diagnosis: Diagnosis, options?: {
        isDryRun?: boolean;
    }): Promise<RecoveryVerificationOutcome>;
}
export declare const globalSupervisorVerifier: SupervisorVerifier;
