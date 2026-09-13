export declare const POLICY_PHASE_EXIT_EVIDENCE_AUDIT_DOMAIN = "POLICY_PHASE_EXIT_EVIDENCE_AUDIT";
export type PhaseExitAuditEventType = 'PHASE_EXIT_AUDIT_STARTED' | 'PHASE_EXIT_EVIDENCE_COLLECTED' | 'PHASE_EXIT_CRITERION_VERIFIED' | 'PHASE_EXIT_CRITERION_BLOCKED' | 'PHASE_EXIT_CIRCULAR_EVIDENCE_DETECTED' | 'PHASE_EXIT_CONFLICTING_EVIDENCE_DETECTED' | 'PHASE_EXIT_AUDIT_COMPLETED' | 'PHASE_EXIT_AUDIT_BLOCKED' | 'USER_STOP_BLOCKED';
export interface PhaseExitAuditEventParams {
    readonly eventType: PhaseExitAuditEventType;
    readonly tenantId: string;
    readonly actorUserId: string;
    readonly details: Record<string, any>;
}
export declare class PolicyPhaseExitAuditEngine {
    private readonly isUserStopActiveFn?;
    constructor(options?: {
        readonly isUserStopActive?: () => boolean;
    });
    private assertUserStopInactive;
    /**
     * Records a sanitized audit event into the global audit ledger.
     */
    recordEvent(params: PhaseExitAuditEventParams): void;
}
