export interface AuditEvent {
    eventId: string;
    timestamp: string;
    actor: {
        userId: string;
        role: string;
        channel: string;
    };
    domain: string;
    toolName: string;
    classification: string;
    argumentsHash: string;
    idempotencyKey?: string;
    policyDecision: 'PERMIT' | 'DENY';
    approvalId?: string;
    executionStatus: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
    resultHash?: string;
    previousHash: string;
    signature: string;
}
export declare class AuditLedger {
    private auditLog;
    private lastHash;
    private filePath?;
    private _corruptionStatus;
    constructor(filePath?: string);
    getCorruptionStatus(): {
        hasCorruption: boolean;
        errors: string[];
    };
    private loadAndVerifyFromDisk;
    /**
     * Append an immutable audit event to the cryptographically linked chain
     * Fails closed if disk persistence fails
     */
    record(eventData: Omit<AuditEvent, 'eventId' | 'previousHash' | 'signature'>): AuditEvent;
    /**
     * Verify the mathematical integrity of the cryptographic chain
     * Returns true if chain is unbroken; false if any record has been modified, deleted or reordered
     */
    verifyChainIntegrity(): boolean;
    getAuditTrail(): AuditEvent[];
    getTrail(filter?: {
        domain?: string;
        limit?: number;
    }): AuditEvent[];
    getLastHash(): string;
    count(): number;
}
export declare const globalAuditLedger: AuditLedger;
