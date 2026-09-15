import { StrategicMemoryCheckpoint } from './GovernedStrategicMemoryTypes';
export interface SecurityContext {
    checkpoint: StrategicMemoryCheckpoint;
    tenantId: string;
    sessionId: string;
    targetTenantId?: string;
    path?: string;
}
export declare class StrategicMemorySecurityBoundary {
    private userStopActive;
    private emergencyStopActive;
    private readonly evaluatedCheckpoints;
    setUserStop(active: boolean): void;
    setEmergencyStop(active: boolean): void;
    isUserStopActive(): boolean;
    isEmergencyStopActive(): boolean;
    evaluateCheckpoint(ctx: SecurityContext): void;
    getEvaluatedCheckpoints(): StrategicMemoryCheckpoint[];
    clear(): void;
    private assertTenantSafety;
    assertSafePath(targetPath: string): void;
}
