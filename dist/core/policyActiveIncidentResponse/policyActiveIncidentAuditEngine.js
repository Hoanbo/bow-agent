// src/core/policyActiveIncidentResponse/policyActiveIncidentAuditEngine.ts
// BOWCON V4.0 — MS-1.3.74: GOVERNED ACTIVE POLICY INCIDENT RESPONSE, DEGRADATION DETECTION & EMERGENCY SAFETY BOUNDARY
//
// Governed Active Incident Audit Engine (Component 838).
// Dual-records canonical policy incident events to globalAuditLedger under domain
// POLICY_ACTIVE_INCIDENT_RESPONSE, enforcing secret sanitization via DiagnosisSanitizer.
//
// Core Authority Invariants:
// - AUDIT_GRANTS_ZERO_AUTHORITY: Produces non-repudiable audit logs only
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED
import crypto from 'node:crypto';
import { globalAuditLedger } from '../auditLedger.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export const POLICY_ACTIVE_INCIDENT_RESPONSE_AUDIT_DOMAIN = 'POLICY_ACTIVE_INCIDENT_RESPONSE';
export class PolicyActiveIncidentAuditEngine {
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
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Active incident audit logging suspended by USER_STOP supremacy');
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
                role: 'system_incident_governor',
                channel: 'GOVERNANCE',
            },
            domain: POLICY_ACTIVE_INCIDENT_RESPONSE_AUDIT_DOMAIN,
            toolName: `incident_response_${event.eventType.toLowerCase()}`,
            classification: 'OBSERVE',
            argumentsHash,
            policyDecision: 'PERMIT',
            executionStatus: 'SUCCESS',
            resultHash: argumentsHash,
        });
    }
}
