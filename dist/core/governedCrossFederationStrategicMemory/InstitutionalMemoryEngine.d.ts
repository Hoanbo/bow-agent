import { StrategicMemoryLifecycleStatus } from './GovernedStrategicMemoryTypes';
export interface InstitutionalSessionState {
    sessionId: string;
    tenantId: string;
    missionId: string;
    status: StrategicMemoryLifecycleStatus;
    version: number;
    totalRecordsIngested: number;
    creationTimestamp: number;
    lastUpdatedTimestamp: number;
    stateHash: string;
    remediedByHuman?: boolean;
}
export declare class InstitutionalMemoryEngine {
    private readonly sessions;
    private readonly activeTenantSessions;
    createSession(tenantId: string, sessionId: string, missionId: string): InstitutionalSessionState;
    getSession(tenantId: string, sessionId: string): InstitutionalSessionState;
    transitionState(tenantId: string, sessionId: string, targetStatus: StrategicMemoryLifecycleStatus, expectedVersion: number): InstitutionalSessionState;
    haltSession(tenantId: string, sessionId: string, stopType: 'USER_STOP' | 'EMERGENCY_STOP'): InstitutionalSessionState;
    incrementRecordsIngested(tenantId: string, sessionId: string, count: number, expectedVersion: number): InstitutionalSessionState;
    clear(): void;
    private assertValidTenant;
    private validateLegalTransition;
}
