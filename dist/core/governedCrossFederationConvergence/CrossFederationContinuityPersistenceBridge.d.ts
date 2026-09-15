import { type CrossFederationAuditEventType, type CrossFederationAuditRecord, type CrossFederationContinuitySnapshot, type CrossFederationConvergenceState, type CrossFederationDriftCategory } from './GovernedCrossFederationTypes.js';
export interface EmitAuditParams {
    readonly eventType: CrossFederationAuditEventType;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly humanOperatorId: string;
    readonly missionId: string;
    readonly participatingFederationIds: readonly string[];
    readonly generation: number;
    readonly payload: Record<string, unknown>;
}
export declare class CrossFederationContinuityPersistenceBridge {
    private readonly storageRoot;
    private readonly auditRecords;
    private readonly snapshots;
    private lastEventHashBySession;
    private lastSnapshotHashBySession;
    constructor(storageRoot?: string);
    validateSafePath(tenantId: string, sessionId: string): void;
    emitAudit(params: EmitAuditParams): CrossFederationAuditRecord;
    captureSnapshot(state: CrossFederationConvergenceState): CrossFederationContinuitySnapshot;
    detectDrift(state: CrossFederationConvergenceState, expectedCategory?: CrossFederationDriftCategory): void;
    persistState(state: CrossFederationConvergenceState, expectedVersion: number): CrossFederationConvergenceState;
    loadState(tenantId: string, sessionId: string): CrossFederationConvergenceState;
    getAuditRecords(tenantId: string, sessionId: string): readonly CrossFederationAuditRecord[];
    getSnapshots(tenantId: string, sessionId: string): readonly CrossFederationContinuitySnapshot[];
    clear(): void;
}
