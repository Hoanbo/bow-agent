export type SupervisorAuditEventType = 'OBSERVATION_RECORDED' | 'ANOMALY_DETECTED' | 'DIAGNOSIS_CREATED' | 'RECOVERY_PLANNED' | 'POLICY_EVALUATED' | 'HUMAN_GATE_CREATED' | 'AUTHORIZATION_RECEIVED' | 'AUTHORIZATION_DENIED' | 'RECOVERY_STARTED' | 'RECOVERY_ATTEMPTED' | 'RECOVERY_VERIFIED' | 'RECOVERY_FAILED' | 'ROLLBACK_STARTED' | 'ROLLBACK_VERIFIED' | 'ESCALATED' | 'SAFE_STOP' | 'OPERATOR_RESET' | 'RUNTIME_RESUME';
export interface SupervisorAuditEntry {
    readonly eventId: string;
    readonly eventType: SupervisorAuditEventType;
    readonly timestamp: string;
    readonly payload: Record<string, any>;
    readonly payloadHash: string;
    readonly previousHash: string;
}
export declare class SupervisorAuditLogger {
    private entries;
    private lastHash;
    record(eventType: SupervisorAuditEventType, payload?: Record<string, any>): SupervisorAuditEntry;
    getAllEntries(): readonly SupervisorAuditEntry[];
    scrub(obj: any): any;
    clear(): void;
}
export declare const globalSupervisorAudit: SupervisorAuditLogger;
