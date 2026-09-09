import type { SupervisorRuntimeState, SupervisorHealth, ObservationSnapshot, Anomaly, Diagnosis, RecoveryPlan, HumanGateRequest, EscalationRecord } from './supervisorTypes.js';
export declare class SupervisorFacade {
    observe(): ObservationSnapshot;
    getActiveAnomalies(): readonly Anomaly[];
    diagnose(anomaly: Anomaly): Diagnosis;
    planRecovery(diagnosis: Diagnosis): RecoveryPlan;
    requestHumanApproval(diagnosis: Diagnosis, plan: RecoveryPlan, options?: {
        target?: string;
        affectedResources?: string[];
    }): HumanGateRequest;
    approveRecovery(requestId: string, operatorId: string, context?: {
        deviceId?: string;
    }): HumanGateRequest;
    denyRecovery(requestId: string, reason: string): HumanGateRequest;
    executeRecovery(plan: RecoveryPlan, diagnosis: Diagnosis, options?: {
        isDryRun?: boolean;
        authorizationToken?: any;
    }): Promise<{
        success: boolean;
        verified: boolean;
        error?: string;
        escalation?: EscalationRecord;
    }>;
    safeStop(reason: string): void;
    resetSafeStop(operatorToken: string): void;
    isSafeStopActive(): boolean;
    getHealth(): SupervisorHealth;
    getCurrentState(): SupervisorRuntimeState;
    getPendingHumanGates(): HumanGateRequest[];
}
export declare const supervisor: SupervisorFacade;
