import type { Diagnosis, RecoveryPlan } from './supervisorTypes.js';
export declare class SupervisorRecoveryPlanner {
    planRecovery(diagnosis: Diagnosis): RecoveryPlan;
}
export declare const globalSupervisorRecoveryPlanner: SupervisorRecoveryPlanner;
