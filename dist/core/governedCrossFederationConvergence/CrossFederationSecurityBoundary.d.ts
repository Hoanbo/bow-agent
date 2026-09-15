import { type CrossFederationCheckpoint } from './GovernedCrossFederationTypes.js';
export declare class CrossFederationSecurityBoundary {
    private userStopActive;
    private emergencyStopActive;
    private readonly executedCheckpoints;
    setUserStop(active: boolean): void;
    setEmergencyStop(active: boolean): void;
    isUserStopActive(): boolean;
    isEmergencyStopActive(): boolean;
    validateSafePathId(id: string): void;
    evaluateCheckpoint(checkpoint: CrossFederationCheckpoint, tenantId?: string, sessionId?: string, targetTenantId?: string, targetSessionId?: string): void;
    getExecutedCheckpoints(): readonly CrossFederationCheckpoint[];
    clear(): void;
}
