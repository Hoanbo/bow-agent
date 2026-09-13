import { type AuditLedger } from '../auditLedger.js';
import { type DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import type { PolicyActiveIncidentResponseOptions } from './policyActiveIncidentResponseTypes.js';
export declare const POLICY_ACTIVE_INCIDENT_RESPONSE_AUDIT_DOMAIN = "POLICY_ACTIVE_INCIDENT_RESPONSE";
export interface ActiveIncidentAuditEvent {
    readonly eventType: 'INCIDENT_DETECTION_STARTED' | 'INCIDENT_DETECTED' | 'INCIDENT_CLASSIFIED' | 'INCIDENT_ESCALATED' | 'DEGRADATION_DETECTED' | 'RUNTIME_DRIFT_DETECTED' | 'PDP_PEP_DRIFT_DETECTED' | 'SAFETY_BOUNDARY_ACTIVATED' | 'SAFETY_BOUNDARY_BLOCKED' | 'HUMAN_REVIEW_REQUIRED' | 'INCIDENT_RESOLVED' | 'INCIDENT_CLOSED' | 'USER_STOP_BLOCKED' | 'TENANT_ISOLATION_BLOCKED' | 'PROVENANCE_TAMPER_BLOCKED';
    readonly tenantPartition: string;
    readonly actorUserId?: string;
    readonly details: Record<string, any>;
}
export declare class PolicyActiveIncidentAuditEngine {
    private readonly ledger;
    private readonly sanitizer;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveIncidentResponseOptions, ledger?: AuditLedger, sanitizer?: DiagnosisSanitizer);
    private assertUserStopInactive;
    /**
     * Records a sanitized audit event to the append-only global audit ledger.
     */
    recordEvent(event: ActiveIncidentAuditEvent): void;
}
