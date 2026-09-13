import { type AuditLedger } from '../auditLedger.js';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import type { PolicyActiveIncidentResolutionOptions } from './policyActiveIncidentResolutionTypes.js';
export declare const POLICY_ACTIVE_INCIDENT_RESOLUTION_AUDIT_DOMAIN = "POLICY_ACTIVE_INCIDENT_RESOLUTION";
export interface IncidentResolutionAuditEvent {
    readonly eventType: string;
    readonly tenantPartition: string;
    readonly actorUserId?: string;
    readonly actorRole?: string;
    readonly details: Record<string, any>;
    readonly timestamp?: string;
}
export declare class PolicyActiveIncidentResolutionAuditEngine {
    private readonly ledger;
    private readonly sanitizer;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveIncidentResolutionOptions, ledger?: AuditLedger, sanitizer?: DiagnosisSanitizer);
    private assertUserStopInactive;
    recordEvent(event: IncidentResolutionAuditEvent): void;
}
