export interface ExecutiveAuditEvent {
    readonly auditId: string;
    readonly sequence: number;
    readonly eventType: string;
    readonly entityId: string;
    readonly timestamp: number;
    readonly details: Record<string, unknown>;
    readonly previousHash: string;
    readonly hash: string;
    readonly signature: string;
}
export declare class ExecutiveAuditLedger {
    private _events;
    private _genesisHash;
    /**
     * Recursively sanitizes secrets from arbitrary objects, replacing values with [REDACTED_SECRET].
     */
    scrubSecrets(obj: unknown): unknown;
    record(eventType: string, entityId: string, details?: Record<string, unknown>): ExecutiveAuditEvent;
    getAll(): readonly ExecutiveAuditEvent[];
    getByGoal(goalId: string): ExecutiveAuditEvent[];
    get events(): readonly ExecutiveAuditEvent[];
    verifyChain(): {
        intact: boolean;
        brokenAt?: number;
    };
    verifyIntegrity(): boolean;
    clear(): void;
}
export declare const globalExecutiveAudit: ExecutiveAuditLedger;
