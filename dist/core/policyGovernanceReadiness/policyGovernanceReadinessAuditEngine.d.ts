import { type AuditLedger } from '../auditLedger.js';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import type { ReadinessAssessmentReport } from './policyGovernanceReadinessTypes.js';
export declare const POLICY_GOVERNANCE_READINESS_AUDIT_DOMAIN = "POLICY_GOVERNANCE_READINESS";
export declare class PolicyGovernanceReadinessAuditEngine {
    private readonly ledger;
    private readonly sanitizer;
    private readonly isUserStopActiveFn?;
    constructor(isUserStopActiveFn?: () => boolean, ledger?: AuditLedger, sanitizer?: DiagnosisSanitizer);
    private assertUserStopInactive;
    /**
     * Records readiness assessment completion to global audit ledger.
     */
    recordAssessmentCompleted(report: ReadinessAssessmentReport, requestedBy: string): void;
}
