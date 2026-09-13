// src/core/policyActiveRollback/policyActiveRollbackAuditEngine.ts
// BOWCON V4.0 — MS-1.3.72: GOVERNED ACTIVE POLICY ROLLBACK, SUNSET & RECOVERY BOUNDARY
//
// Governed Active Rollback Audit Engine (Component 816).
// Emits structured, sanitized audit events to the globalAuditLedger under the
// domain POLICY_ACTIVE_ROLLBACK.
//
// Invariants:
// - CANONICAL_AUDIT_LEDGER_EMISSION
// - ZERO_SECRET_LEAKAGE: Scrubbed via DiagnosisSanitizer
// - USER_STOP > EVERYTHING
import crypto from 'node:crypto';
import { globalAuditLedger } from '../auditLedger.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export const POLICY_ACTIVE_ROLLBACK_AUDIT_DOMAIN = 'POLICY_ACTIVE_ROLLBACK';
export class PolicyActiveRollbackAuditEngine {
    ledger;
    sanitizer;
    isUserStopActiveFn;
    constructor(options, ledger, sanitizer) {
        this.isUserStopActiveFn = options?.isUserStopActive;
        this.ledger = ledger ?? globalAuditLedger;
        this.sanitizer = sanitizer ?? globalDiagnosisSanitizer;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Rollback audit suspended by USER_STOP supremacy');
        }
    }
    /**
     * Records a sanitized audit event to the append-only ledger.
     */
    recordEvent(params) {
        this.assertUserStopInactive();
        const timestamp = new Date().toISOString();
        const sanitizedDetails = this.sanitizer.sanitize(params.details);
        const argumentsHash = crypto
            .createHash('sha256')
            .update(JSON.stringify(sanitizedDetails))
            .digest('hex');
        this.ledger.record({
            timestamp,
            actor: {
                userId: params.actorUserId ?? params.tenantPartition,
                role: params.actorRole ?? 'internal',
                channel: 'GOVERNANCE',
            },
            domain: POLICY_ACTIVE_ROLLBACK_AUDIT_DOMAIN,
            toolName: `active_rollback_${params.eventType.toLowerCase()}`,
            classification: 'OBSERVE',
            argumentsHash,
            policyDecision: 'PERMIT',
            executionStatus: 'SUCCESS',
            resultHash: argumentsHash,
        });
    }
}
