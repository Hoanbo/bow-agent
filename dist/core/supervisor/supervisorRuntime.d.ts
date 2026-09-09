import type { SupervisorRuntimeState, SupervisorHealth, ObservationSnapshot, Anomaly, Diagnosis, RecoveryPlan, HumanGateRequest, EscalationRecord } from './supervisorTypes.js';
export declare class SupervisorRuntime {
    private _state;
    private _safeStop;
    private _safeStopReason?;
    private _activeAnomalies;
    private _activeDiagnoses;
    private _activePlans;
    private _totalRecoveriesAttempted;
    private _totalRecoveriesSucceeded;
    private _totalRecoveriesFailed;
    private _startTime;
    constructor();
    getCurrentState(): SupervisorRuntimeState;
    private transitionTo;
    activateSafeStop(reason: string): void;
    triggerSafeStop(reason: string): void;
    resetSafeStop(operatorToken: string): void;
    isSafeStopActive(): boolean;
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
    getHealth(): SupervisorHealth;
    reset(): void;
}
export declare const globalSupervisorRuntime: SupervisorRuntime;
