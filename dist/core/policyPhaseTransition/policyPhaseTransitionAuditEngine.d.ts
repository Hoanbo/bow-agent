import { type AuditLedger } from '../auditLedger.js';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export declare const POLICY_PHASE_TRANSITION_AUDIT_DOMAIN = "POLICY_PHASE_TRANSITION";
export interface PhaseTransitionAuditEvent {
    readonly eventType: string;
    readonly tenantId: string;
    readonly actorUserId?: string;
    readonly actorRole?: string;
    readonly details: Record<string, any>;
    readonly timestamp?: string;
    readonly executionStatus?: string;
}
export declare class PolicyPhaseTransitionAuditEngine {
    private readonly ledger;
    private readonly sanitizer;
    private readonly isUserStopActiveFn?;
    constructor(options?: {
        readonly isUserStopActive?: () => boolean;
        readonly ledger?: AuditLedger;
        readonly sanitizer?: DiagnosisSanitizer;
    });
    private assertUserStopInactive;
    /**
     * Records a structured phase transition audit event to the global ledger.
     */
    recordEvent(event: PhaseTransitionAuditEvent): void;
}
