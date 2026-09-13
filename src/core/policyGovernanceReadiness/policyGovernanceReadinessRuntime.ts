// src/core/policyGovernanceReadiness/policyGovernanceReadinessRuntime.ts
// BOWCON V4.0 — MS-1.3.76: GOVERNED POLICY GOVERNANCE PLANE END-TO-END VALIDATION,
// EVIDENCE-BASED READINESS ASSESSMENT & CONDITIONAL PHASE EXIT GATE
//
// Master Readiness Assessment Runtime Coordinator (Component 868).
// Coordinates the full end-to-end evidence collection, criteria evaluation,
// readiness synthesis, report persistence, and audit logging.
//
// Core Authority Invariants:
// - READINESS_ASSESSMENT != POLICY_AUTHORITY
// - READINESS_ASSESSMENT != POLICY_MUTATION
// - READINESS_ASSESSMENT != PHASE_COMPLETION_AUTHORITY
// - READINESS_ASSESSMENT != AUTONOMOUS_REMEDIATION
// - READINESS_ASSESSMENT != AUTONOMOUS_PHASE_EXIT
// - PHASE_EXIT_DECLARATION === 'HUMAN_AUTHORITY_REQUIRED' (ALWAYS)
// - USER_STOP > EVERYTHING
// - ZERO AUTONOMOUS POLICY MUTATION
// - ZERO AUTONOMOUS POLICY ACTIVATION
// - ZERO AUTONOMOUS ROLLBACK / SUNSET / RECOVERY
// - FAIL_CLOSED

import {
  type AssessmentId,
  type ReadinessAssessmentReport,
  type PolicyGovernanceReadinessOptions,
  createAssessmentId,
} from './policyGovernanceReadinessTypes.js';
import { PolicyGovernanceReadinessRepositoryInspector } from './policyGovernanceReadinessRepositoryInspector.js';
import { PolicyGovernanceReadinessIntegrationInspector } from './policyGovernanceReadinessIntegrationInspector.js';
import { PolicyGovernanceReadinessSecurityInspector } from './policyGovernanceReadinessSecurityInspector.js';
import { PolicyGovernanceReadinessAuthorityInspector } from './policyGovernanceReadinessAuthorityInspector.js';
import { PolicyGovernanceReadinessTenantInspector } from './policyGovernanceReadinessTenantInspector.js';
import { PolicyGovernanceReadinessProvenanceInspector } from './policyGovernanceReadinessProvenanceInspector.js';
import { PolicyGovernanceReadinessAuditInspector } from './policyGovernanceReadinessAuditInspector.js';
import { PolicyGovernanceReadinessEvidenceEngine } from './policyGovernanceReadinessEvidenceEngine.js';
import { PolicyGovernanceReadinessAssessmentEngine } from './policyGovernanceReadinessAssessmentEngine.js';
import { PolicyGovernanceReadinessReportStore } from './policyGovernanceReadinessReportStore.js';
import { PolicyGovernanceReadinessAuditEngine } from './policyGovernanceReadinessAuditEngine.js';

export class PolicyGovernanceReadinessRuntime {
  private readonly repositoryInspector: PolicyGovernanceReadinessRepositoryInspector;
  private readonly integrationInspector: PolicyGovernanceReadinessIntegrationInspector;
  private readonly securityInspector: PolicyGovernanceReadinessSecurityInspector;
  private readonly authorityInspector: PolicyGovernanceReadinessAuthorityInspector;
  private readonly tenantInspector: PolicyGovernanceReadinessTenantInspector;
  private readonly provenanceInspector: PolicyGovernanceReadinessProvenanceInspector;
  private readonly auditInspector: PolicyGovernanceReadinessAuditInspector;
  private readonly evidenceEngine: PolicyGovernanceReadinessEvidenceEngine;
  private readonly assessmentEngine: PolicyGovernanceReadinessAssessmentEngine;
  private readonly store: PolicyGovernanceReadinessReportStore;
  private readonly auditEngine: PolicyGovernanceReadinessAuditEngine;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(
    options?: {
      readonly repositoryRoot?: string;
      readonly isUserStopActive?: () => boolean;
      readonly storeBaseDir?: string;
    }
  ) {
    const root = options?.repositoryRoot || process.cwd();
    this.isUserStopActiveFn = options?.isUserStopActive;

    this.repositoryInspector = new PolicyGovernanceReadinessRepositoryInspector(root);
    this.integrationInspector = new PolicyGovernanceReadinessIntegrationInspector(root);
    this.securityInspector = new PolicyGovernanceReadinessSecurityInspector(root);
    this.authorityInspector = new PolicyGovernanceReadinessAuthorityInspector(root);
    this.tenantInspector = new PolicyGovernanceReadinessTenantInspector(root);
    this.provenanceInspector = new PolicyGovernanceReadinessProvenanceInspector(root);
    this.auditInspector = new PolicyGovernanceReadinessAuditInspector(root);
    this.evidenceEngine = new PolicyGovernanceReadinessEvidenceEngine();
    this.assessmentEngine = new PolicyGovernanceReadinessAssessmentEngine();
    this.store = new PolicyGovernanceReadinessReportStore(options?.storeBaseDir);
    this.auditEngine = new PolicyGovernanceReadinessAuditEngine(this.isUserStopActiveFn);
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Readiness runtime suspended by USER_STOP supremacy');
    }
  }

  /**
   * Executes the full, evidence-based readiness assessment for a tenant.
   * Strictly read-only, non-mutating, and non-authoritative.
   */
  public executeAssessment(options: PolicyGovernanceReadinessOptions): ReadinessAssessmentReport {
    this.assertUserStopInactive();

    if (!options || !options.tenantId || typeof options.tenantId !== 'string' || options.tenantId.trim().length === 0) {
      throw new Error('INVALID_OPTIONS: tenantId is required');
    }

    const assessmentId: AssessmentId = createAssessmentId(
      `assess_${options.tenantId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    );

    // 1. Run all multi-dimensional inspectors
    const repositoryFindings = this.repositoryInspector.inspect();
    const integrationFindings = this.integrationInspector.inspect();
    const securityFindings = this.securityInspector.inspect();
    const authorityFindings = this.authorityInspector.inspect();
    const tenantFindings = this.tenantInspector.inspect();
    const provenanceFindings = this.provenanceInspector.inspect();
    const auditFindings = this.auditInspector.inspect();

    this.assertUserStopInactive();

    // 2. Evaluate all 24 canonical criteria using evidence
    const criteriaResults = this.evidenceEngine.evaluateAll({
      repositoryFindings,
      integrationFindings,
      securityFindings,
      authorityFindings,
      tenantFindings,
      provenanceFindings,
      auditFindings,
      overrides: options.customEvaluationOverrides,
    });

    this.assertUserStopInactive();

    // 3. Synthesize final assessment report
    const report = this.assessmentEngine.generateReport({
      assessmentId,
      tenantId: options.tenantId,
      repositoryFindings,
      integrationFindings,
      securityFindings,
      authorityFindings,
      tenantFindings,
      provenanceFindings,
      auditFindings,
      criteriaResults,
    });

    // 4. Save report in durable store
    this.store.saveReport(report);

    // 5. Emit canonical audit record
    this.auditEngine.recordAssessmentCompleted(report, options.requestedBy);

    return report;
  }

  /**
   * Retrieves a previously generated assessment report.
   */
  public getReport(tenantId: string, reportId: any): ReadinessAssessmentReport | undefined {
    return this.store.getReport(tenantId, reportId);
  }

  /**
   * Lists all reports for a given tenant.
   */
  public listReports(tenantId: string): readonly ReadinessAssessmentReport[] {
    return this.store.listReports(tenantId);
  }
}
