export type LoopAuditEventType = 'OBJECTIVE_CREATED' | 'OBSERVATION_CREATED' | 'REASONING_COMPLETED' | 'PLAN_CREATED' | 'GOVERNANCE_EVALUATED' | 'AUTHORIZATION_REQUESTED' | 'AUTHORIZATION_GRANTED' | 'AUTHORIZATION_DENIED' | 'ACTION_STARTED' | 'ACTION_VERIFIED' | 'ACTION_FAILED' | 'RECOVERY_STARTED' | 'RECOVERY_VERIFIED' | 'ESCALATION_CREATED' | 'USER_PAUSED' | 'USER_RESUMED' | 'USER_STOPPED' | 'RUNTIME_RESET' | 'RUNTIME_RESTARTED';
export interface LoopAuditEntry {
    readonly auditId: string;
    readonly timestamp: number;
    readonly eventType: LoopAuditEventType;
    readonly payload: Record<string, any>;
    readonly previousHash: string;
    readonly payloadHash: string;
}
export declare class AgentLoopAuditLedger {
    private readonly ledger;
    private lastHash;
    private redactSecrets;
    record(eventType: LoopAuditEventType, payload: Record<string, any>): LoopAuditEntry;
    getEntries(): readonly LoopAuditEntry[];
    verifyChainIntegrity(): boolean;
    clear(): void;
}
export declare const globalAgentLoopAudit: AgentLoopAuditLedger;
