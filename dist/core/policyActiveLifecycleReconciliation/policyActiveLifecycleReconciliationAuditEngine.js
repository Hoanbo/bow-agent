// src/core/policyActiveLifecycleReconciliation/policyActiveLifecycleReconciliationAuditEngine.ts
// BOWCON V4.0 — MS-1.3.73: GOVERNED ACTIVE POLICY LIFECYCLE RECONCILIATION & CONSISTENCY VERIFICATION
//
// Governed Lifecycle Reconciliation Audit Engine (Component 827).
// Dual-records canonical lifecycle reconciliation events to globalAuditLedger under the
// domain POLICY_ACTIVE_LIFECYCLE_RECONCILIATION, enforcing secret sanitization via DiagnosisSanitizer.
//
// Core Authority Invariants:
// - AUDIT_GRANTS_ZERO_AUTHORITY: Produces non-repudiable audit logs only
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED
import crypto from 'node:crypto';
import { globalAuditLedger } from '../auditLedger.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export const POLICY_ACTIVE_LIFECYCLE_RECONCILIATION_AUDIT_DOMAIN = 'POLICY_ACTIVE_LIFECYCLE_RECONCILIATION';
export class PolicyActiveLifecycleReconciliationAuditEngine {
    ledger;
    sanitizer;
    isUserStopActiveFn;
    constructor(options, ledger, sanitizer) {
        this.ledger = ledger ?? globalAuditLedger;
        this.sanitizer = sanitizer ?? globalDiagnosisSanitizer;
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Lifecycle reconciliation audit logging suspended by USER_STOP supremacy');
        }
    }
    /**
     * Records a sanitized audit event to the append-only global audit ledger.
     */
    recordEvent(event) {
        this.assertUserStopInactive();
        const timestamp = new Date().toISOString();
        const sanitizedDetails = this.sanitizer.sanitize(event.details);
        const argumentsHash = crypto
            .createHash('sha256')
            .update(JSON.stringify(sanitizedDetails))
            .digest('hex');
        this.ledger.record({
            timestamp,
            actor: {
                userId: event.actorUserId ?? event.tenantPartition,
                role: 'system_reconciler',
                channel: 'GOVERNANCE',
            },
            domain: POLICY_ACTIVE_LIFECYCLE_RECONCILIATION_AUDIT_DOMAIN,
            toolName: `active_reconciliation_${event.eventType.toLowerCase()}`,
            classification: 'OBSERVE',
            argumentsHash,
            policyDecision: 'PERMIT',
            executionStatus: 'SUCCESS',
            resultHash: argumentsHash,
        });
    }
}
