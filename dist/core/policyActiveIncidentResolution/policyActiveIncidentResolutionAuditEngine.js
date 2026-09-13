// src/core/policyActiveIncidentResolution/policyActiveIncidentResolutionAuditEngine.ts
// BOWCON V4.0 — MS-1.3.75: GOVERNED ACTIVE POLICY INCIDENT RESOLUTION, CONTAINMENT CLEARANCE & RECOVERY AUTHORIZATION BOUNDARY
//
// Governed Incident Resolution Audit Engine (Component 852).
// Appends canonical audit events to the globalAuditLedger under the domain
// POLICY_ACTIVE_INCIDENT_RESOLUTION. Enforces secret scrubbing via DiagnosisSanitizer.
//
// Core Authority Invariants:
// - AUDIT_ENGINE_HOLDS_ZERO_AUTHORITY
// - SECRETS_MUST_BE_STRIPPED_BEFORE_PERSISTENCE
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED
import { globalAuditLedger } from '../auditLedger.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export const POLICY_ACTIVE_INCIDENT_RESOLUTION_AUDIT_DOMAIN = 'POLICY_ACTIVE_INCIDENT_RESOLUTION';
export class PolicyActiveIncidentResolutionAuditEngine {
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
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Audit engine suspended by USER_STOP supremacy');
        }
    }
    recordEvent(event) {
        this.assertUserStopInactive();
        const timestamp = event.timestamp ?? new Date().toISOString();
        const sanitizedDetails = this.sanitizer.sanitize(event.details ?? {});
        this.ledger.record({
            timestamp,
            actor: {
                userId: event.actorUserId ?? event.tenantPartition,
                role: event.actorRole ?? 'SYSTEM',
                channel: 'GOVERNANCE',
            },
            domain: POLICY_ACTIVE_INCIDENT_RESOLUTION_AUDIT_DOMAIN,
            toolName: `incident_resolution_${event.eventType.toLowerCase()}`,
            classification: 'OBSERVE',
            argumentsHash: '',
            policyDecision: 'PERMIT',
            executionStatus: 'SUCCESS',
            resultHash: '',
            details: sanitizedDetails,
        });
    }
}
