// src/core/policyGovernanceReadiness/policyGovernanceReadinessAuditEngine.ts
// BOWCON V4.0 — MS-1.3.76: GOVERNED POLICY GOVERNANCE PLANE END-TO-END VALIDATION,
// EVIDENCE-BASED READINESS ASSESSMENT & CONDITIONAL PHASE EXIT GATE
//
// Audit Engine (Component 867).
// Emits canonical audit events to globalAuditLedger under domain POLICY_GOVERNANCE_READINESS.
// Enforces secret sanitization via DiagnosisSanitizer. Strictly non-authoritative.

import { globalAuditLedger, type AuditLedger } from '../auditLedger.js';
import { DiagnosisSanitizer, globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import type { ReadinessAssessmentReport } from './policyGovernanceReadinessTypes.js';

export const POLICY_GOVERNANCE_READINESS_AUDIT_DOMAIN = 'POLICY_GOVERNANCE_READINESS';

export class PolicyGovernanceReadinessAuditEngine {
  private readonly ledger: AuditLedger;
  private readonly sanitizer: DiagnosisSanitizer;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(isUserStopActiveFn?: () => boolean, ledger?: AuditLedger, sanitizer?: DiagnosisSanitizer) {
    this.ledger = ledger ?? globalAuditLedger;
    this.sanitizer = sanitizer ?? globalDiagnosisSanitizer;
    this.isUserStopActiveFn = isUserStopActiveFn;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Audit engine suspended by USER_STOP supremacy');
    }
  }

  /**
   * Records readiness assessment completion to global audit ledger.
   */
  public recordAssessmentCompleted(report: ReadinessAssessmentReport, requestedBy: string): void {
    this.assertUserStopInactive();

    const timestamp = report.timestamp || new Date().toISOString();
    const details = {
      assessmentId: report.assessmentId,
      reportId: report.reportId,
      readinessStatus: report.readinessStatus,
      phaseExitRecommendation: report.phaseExitRecommendation,
      phaseExitDeclaration: report.phaseExitDeclaration,
      passedCriteriaCount: report.passedCriteria.length,
      failedCriteriaCount: report.failedCriteria.length,
      partialCriteriaCount: report.partialCriteria.length,
      untestedCriteriaCount: report.untestedCriteria.length,
      provenanceHash: report.provenanceHash,
    };

    const sanitizedDetails = this.sanitizer.sanitize(details);

    this.ledger.record({
      timestamp,
      actor: {
        userId: requestedBy || report.tenantId,
        role: 'AUDITOR',
        channel: 'GOVERNANCE',
      },
      domain: POLICY_GOVERNANCE_READINESS_AUDIT_DOMAIN,
      toolName: 'readiness_assessment_completed',
      classification: 'OBSERVE',
      argumentsHash: '',
      policyDecision: 'PERMIT',
      executionStatus: 'SUCCESS',
      resultHash: report.provenanceHash,
      details: typeof sanitizedDetails === 'string' ? JSON.parse(sanitizedDetails) : sanitizedDetails,
    } as any);
  }
}
