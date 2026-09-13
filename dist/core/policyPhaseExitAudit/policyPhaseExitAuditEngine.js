// src/core/policyPhaseExitAudit/policyPhaseExitAuditEngine.ts
// BOWCON V4.0 — MS-1.3.78: INDEPENDENT PHASE 1.3 EXIT EVIDENCE AUDIT & GOVERNANCE READINESS CERTIFICATION
//
// Canonical Audit Engine (Component 898).
// Records structured audit events under domain POLICY_PHASE_EXIT_EVIDENCE_AUDIT to globalAuditLedger.
// Sanitizes all payloads via DiagnosisSanitizer.
//
// Core Authority Invariants:
// - AUDIT != POLICY_AUTHORITY
// - AUDIT != POLICY_MUTATION
// - USER_STOP > EVERYTHING
import { globalAuditLedger } from '../auditLedger.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export const POLICY_PHASE_EXIT_EVIDENCE_AUDIT_DOMAIN = 'POLICY_PHASE_EXIT_EVIDENCE_AUDIT';
export class PolicyPhaseExitAuditEngine {
    isUserStopActiveFn;
    constructor(options) {
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Audit engine suspended by USER_STOP supremacy');
        }
    }
    /**
     * Records a sanitized audit event into the global audit ledger.
     */
    recordEvent(params) {
        this.assertUserStopInactive();
        const sanitizedDetails = globalDiagnosisSanitizer.sanitize(params.details);
        globalAuditLedger.record({
            timestamp: new Date().toISOString(),
            actor: {
                userId: params.actorUserId ?? params.tenantId,
                role: 'AUDITOR',
                channel: 'GOVERNANCE',
            },
            domain: POLICY_PHASE_EXIT_EVIDENCE_AUDIT_DOMAIN,
            toolName: `audit_${params.eventType.toLowerCase()}`,
            classification: 'OBSERVE',
            argumentsHash: '',
            policyDecision: 'PERMIT',
            executionStatus: 'SUCCESS',
            resultHash: '',
            metadata: sanitizedDetails,
            details: sanitizedDetails,
        });
    }
}
