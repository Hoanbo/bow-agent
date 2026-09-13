import { AuditLedger } from '../auditLedger.js';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import type { PolicyActiveRuntimeOptions } from './policyActiveRuntimeTypes.js';
export declare const ACTIVE_RUNTIME_AUDIT_DOMAIN = "ACTIVE_POLICY_RUNTIME_SYNCHRONIZATION";
export declare class PolicyActiveRuntimeAuditEngine {
    private readonly ledger;
    private readonly sanitizer;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveRuntimeOptions, ledger?: AuditLedger, sanitizer?: DiagnosisSanitizer);
    private assertUserStopInactive;
    /**
     * Records a sanitized audit event to the append-only ledger.
     */
    recordEvent(params: {
        eventType: string;
        tenantPartition: string;
        actorUserId?: string;
        actorRole?: string;
        details: Record<string, any>;
    }): void;
}
