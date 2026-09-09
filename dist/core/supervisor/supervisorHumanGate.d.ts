import type { Diagnosis, RecoveryPlan, HumanGateRequest } from './supervisorTypes.js';
export declare class SupervisorHumanGate {
    private pendingRequests;
    createRequest(diagnosis: Diagnosis, plan: RecoveryPlan, options?: {
        target?: string;
        affectedResources?: string[];
        expectedEffects?: string[];
        ttlMs?: number;
        authorizationContext?: HumanGateRequest['authorizationContext'];
    }): HumanGateRequest;
    getPendingRequest(requestId: string): HumanGateRequest | undefined;
    getRequest(requestId: string): HumanGateRequest | undefined;
    getAllPendingRequests(): HumanGateRequest[];
    getPendingRequests(): HumanGateRequest[];
    approve(requestId: string, operatorId: string, context?: {
        deviceId?: string;
        sessionId?: string;
        goalId?: string;
        taskId?: string;
    }): HumanGateRequest;
    deny(requestId: string, reason: string): HumanGateRequest;
    reject(requestId: string, operatorId: string, reason?: string): HumanGateRequest;
    cancelAllBySafeStop(): void;
    clear(): void;
}
export declare const globalSupervisorHumanGate: SupervisorHumanGate;
export declare const globalHumanGate: SupervisorHumanGate;
export { SupervisorHumanGate as HumanGate };
