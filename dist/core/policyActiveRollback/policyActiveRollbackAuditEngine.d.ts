import { AuditLedger } from '../auditLedger.js';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import type { PolicyActiveRollbackOptions } from './policyActiveRollbackTypes.js';
export declare const POLICY_ACTIVE_ROLLBACK_AUDIT_DOMAIN = "POLICY_ACTIVE_ROLLBACK";
export declare class PolicyActiveRollbackAuditEngine {
    private readonly ledger;
    private readonly sanitizer;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveRollbackOptions, ledger?: AuditLedger, sanitizer?: DiagnosisSanitizer);
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
