// src/core/policyPhaseExitAudit/policyPhaseExitMilestoneInspector.ts
// BOWCON V4.0 — MS-1.3.78: INDEPENDENT PHASE 1.3 EXIT EVIDENCE AUDIT & GOVERNANCE READINESS CERTIFICATION
//
// Milestone Completeness Inspector (Component 887).
// Verifies implementation, export, test, and documentation completeness across all 16 Phase 1.3 milestones.
// Strictly read-only; alters ZERO state.
//
// Core Authority Invariants:
// - AUDIT != POLICY_MUTATION
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED

import fs from 'node:fs';
import path from 'node:path';
import type { GovernanceMilestone } from './policyPhaseExitAuditTypes.js';

export interface MilestoneAuditFinding {
  readonly milestone: GovernanceMilestone;
  readonly name: string;
  readonly directory: string;
  readonly testFile: string;
  readonly implemented: boolean;
  readonly exported: boolean;
  readonly tested: boolean;
  readonly documented: boolean;
  readonly issues: readonly string[];
}

export class PolicyPhaseExitMilestoneInspector {
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: { readonly isUserStopActive?: () => boolean }) {
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Milestone inspector suspended by USER_STOP supremacy');
    }
  }

  /**
   * Inspects all 16 Phase 1.3 milestones for concrete evidence.
   */
  public inspectMilestones(): readonly MilestoneAuditFinding[] {
    this.assertUserStopInactive();

    const matrixPath = path.resolve('docs/BOWCON_V4_COMPONENT_MATRIX.md');
    const matrixContent = fs.existsSync(matrixPath) ? fs.readFileSync(matrixPath, 'utf-8') : '';

    const indexPath = path.resolve('src/index.ts');
    const indexContent = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf-8') : '';

    const milestoneSpecs: Array<{ milestone: GovernanceMilestone; name: string; dir: string; test: string; exportToken: string }> = [
      { milestone: 'MS-1.3.62', name: 'Policy Observability & Audit', dir: 'src/core/policyObservability', test: 'tests/test_v4_agent_governed_policy_observability.ts', exportToken: 'policyObservability' },
      { milestone: 'MS-1.3.63', name: 'Policy Evidence Investigation', dir: 'src/core/policyEvidence', test: 'tests/test_v4_agent_governed_policy_evidence_investigation.ts', exportToken: 'policyEvidence' },
      { milestone: 'MS-1.3.64', name: 'Continuous Policy Decision', dir: 'src/core/policyDecision', test: 'tests/test_v4_agent_governed_policy_decision.ts', exportToken: 'policyDecision' },
      { milestone: 'MS-1.3.65', name: 'Governed Policy Execution', dir: 'src/core/policyExecution', test: 'tests/test_v4_agent_governed_policy_execution.ts', exportToken: 'policyExecution' },
      { milestone: 'MS-1.3.66', name: 'Policy Post-Execution Reconciliation', dir: 'src/core/policyPostExecution', test: 'tests/test_v4_agent_governed_post_execution.ts', exportToken: 'policyPostExecution' },
      { milestone: 'MS-1.3.67', name: 'Policy Feedback Review', dir: 'src/core/policyFeedbackReview', test: 'tests/test_v4_agent_governed_feedback_review.ts', exportToken: 'policyFeedbackReview' },
      { milestone: 'MS-1.3.68', name: 'Policy Evolution Planning', dir: 'src/core/policyEvolutionPlanning', test: 'tests/test_v4_agent_governed_policy_evolution_planning.ts', exportToken: 'policyEvolutionPlanning' },
      { milestone: 'MS-1.3.69', name: 'Candidate Authorization Boundary', dir: 'src/core/policyCandidateAuthorization', test: 'tests/test_v4_agent_governed_candidate_authorization.ts', exportToken: 'policyCandidateAuthorization' },
      { milestone: 'MS-1.3.70', name: 'Staged Policy Activation Boundary', dir: 'src/core/policyStagedActivation', test: 'tests/test_v4_agent_governed_staged_policy_activation.ts', exportToken: 'policyStagedActivation' },
      { milestone: 'MS-1.3.71', name: 'Active Policy Runtime Synchronization', dir: 'src/core/policyActiveRuntime', test: 'tests/test_v4_agent_governed_active_policy_runtime_synchronization.ts', exportToken: 'policyActiveRuntime' },
      { milestone: 'MS-1.3.72', name: 'Active Policy Rollback Boundary', dir: 'src/core/policyActiveRollback', test: 'tests/test_v4_agent_governed_active_policy_rollback.ts', exportToken: 'policyActiveRollback' },
      { milestone: 'MS-1.3.73', name: 'Active Policy Lifecycle Reconciliation', dir: 'src/core/policyActiveLifecycleReconciliation', test: 'tests/test_v4_agent_governed_active_policy_lifecycle_reconciliation.ts', exportToken: 'policyActiveLifecycleReconciliation' },
      { milestone: 'MS-1.3.74', name: 'Active Policy Incident Response', dir: 'src/core/policyActiveIncidentResponse', test: 'tests/test_v4_agent_governed_active_policy_incident_response.ts', exportToken: 'policyActiveIncidentResponse' },
      { milestone: 'MS-1.3.75', name: 'Active Policy Incident Resolution', dir: 'src/core/policyActiveIncidentResolution', test: 'tests/test_v4_agent_governed_active_policy_incident_resolution.ts', exportToken: 'policyActiveIncidentResolution' },
      { milestone: 'MS-1.3.76', name: 'Policy Governance Readiness Assessment', dir: 'src/core/policyGovernanceReadiness', test: 'tests/test_v4_agent_governed_policy_governance_readiness.ts', exportToken: 'policyGovernanceReadiness' },
      { milestone: 'MS-1.3.77', name: 'Phase Exit & Phase 1.4 Entry Boundary', dir: 'src/core/policyPhaseTransition', test: 'tests/test_v4_agent_governed_phase_exit_and_phase14_entry.ts', exportToken: 'policyPhaseTransition' },
    ];

    const findings: MilestoneAuditFinding[] = [];

    for (const spec of milestoneSpecs) {
      const issues: string[] = [];
      const dirResolved = path.resolve(spec.dir);
      const testResolved = path.resolve(spec.test);

      const implemented = fs.existsSync(dirResolved) && fs.existsSync(path.join(dirResolved, 'index.ts'));
      if (!implemented) {
        issues.push(`MISSING_IMPLEMENTATION: Directory ${spec.dir} or its index.ts is absent`);
      }

      const exported = indexContent.includes(spec.exportToken);
      if (!exported) {
        issues.push(`MISSING_EXPORT: Token ${spec.exportToken} not found in src/index.ts`);
      }

      const tested = fs.existsSync(testResolved);
      if (!tested) {
        issues.push(`MISSING_DEDICATED_TEST: Test suite ${spec.test} not found`);
      }

      const documented = matrixContent.includes(spec.milestone) || matrixContent.includes(spec.milestone.replace('MS-', 'Milestone '));
      if (!documented) {
        issues.push(`MISSING_MATRIX_ENTRY: Milestone ${spec.milestone} not documented in component matrix`);
      }

      findings.push(Object.freeze({
        milestone: spec.milestone,
        name: spec.name,
        directory: spec.dir,
        testFile: spec.test,
        implemented,
        exported,
        tested,
        documented,
        issues: Object.freeze(issues),
      }));
    }

    return Object.freeze(findings);
  }
}
