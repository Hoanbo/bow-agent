// src/core/policyActiveRuntime/policyActiveRuntimeAuditEngine.ts
// BOWCON V4.0 — MS-1.3.71: GOVERNED ACTIVE POLICY RUNTIME SYNCHRONIZATION & ENFORCEMENT BRIDGE
//
// Governed Active Runtime Audit Engine (Component 804).
// Emits structured, sanitized audit events to the globalAuditLedger under the
// domain ACTIVE_POLICY_RUNTIME_SYNCHRONIZATION.
//
// Invariants:
// - CANONICAL_AUDIT_LEDGER_EMISSION
// - ZERO_SECRET_LEAKAGE (DiagnosisSanitizer scrubbing)
// - USER_STOP > EVERYTHING
import crypto from 'node:crypto';
import { globalAuditLedger } from '../auditLedger.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export const ACTIVE_RUNTIME_AUDIT_DOMAIN = 'ACTIVE_POLICY_RUNTIME_SYNCHRONIZATION';
export class PolicyActiveRuntimeAuditEngine {
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
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Active runtime audit suspended by USER_STOP supremacy');
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
                role: params.actorRole ?? 'runtime_operator',
                channel: 'GOVERNANCE',
            },
            domain: ACTIVE_RUNTIME_AUDIT_DOMAIN,
            toolName: `active_runtime_${params.eventType.toLowerCase()}`,
            classification: 'OBSERVE',
            argumentsHash,
            policyDecision: 'PERMIT',
            executionStatus: 'SUCCESS',
            resultHash: argumentsHash,
        });
    }
}
