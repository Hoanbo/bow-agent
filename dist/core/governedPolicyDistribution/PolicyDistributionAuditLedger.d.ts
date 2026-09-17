import { type DistributionAuditEventInput, type DistributionAuditRecord, type LedgerVerificationResult, type EmergencyStopProvider, type PolicyDomain, type UuidV4Generator } from './GovernedPolicyDistributionTypes.js';
export interface PolicyDistributionAuditLedgerOptions {
    baseStorageDir?: string;
    emergencyStopProvider?: EmergencyStopProvider;
    uuidGenerator?: UuidV4Generator;
}
export declare class PolicyDistributionAuditLedger {
    private readonly baseStorageDir;
    private readonly emergencyStopProvider?;
    private readonly uuidGenerator?;
    constructor(baseStorageDirOrOptions?: string | PolicyDistributionAuditLedgerOptions, emergencyStopProvider?: EmergencyStopProvider, uuidGenerator?: UuidV4Generator);
    private getPartitionDir;
    private getLedgerFilePath;
    private generateEventId;
    private acquireLock;
    private readLastEventHashUnderLock;
    /**
     * Appends an audit event to the append-only SHA-256 chain.
     * Performs recursive secret scrubbing before canonicalization and hashing.
     */
    append(input: DistributionAuditEventInput, nowMs: number): Promise<DistributionAuditRecord>;
    /**
     * Verifies the cryptographic integrity of the audit chain from genesis to head.
     */
    verify(tenantId: string, domain: PolicyDomain): Promise<LedgerVerificationResult>;
}
