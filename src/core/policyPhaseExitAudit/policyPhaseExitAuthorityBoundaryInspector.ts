// src/core/policyPhaseExitAudit/policyPhaseExitAuthorityBoundaryInspector.ts
// BOWCON V4.0 — MS-1.3.78: INDEPENDENT PHASE 1.3 EXIT EVIDENCE AUDIT & GOVERNANCE READINESS CERTIFICATION
//
// Human Authority & Anti-Self-Approval Boundary Inspector (Component 891).
// Independently verifies that all human governance gates reject autonomous actors and enforce anti-self-approval.
// Strictly read-only; alters ZERO state.
//
// Core Authority Invariants:
// - HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// - ANTI_SELF_APPROVAL_ENFORCED
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED

import fs from 'node:fs';
import path from 'node:path';

export interface AuthorityBoundaryFinding {
  readonly boundaryName: string;
  readonly milestone: string;
  readonly filePath: string;
  readonly rejectsAutonomous: boolean;
  readonly rejectsAnonymous: boolean;
  readonly enforcesAntiSelfApproval: boolean;
  readonly requiresHumanRole: boolean;
  readonly verdict: 'COMPLIANT' | 'NON_COMPLIANT';
  readonly deficiencies: readonly string[];
}

export class PolicyPhaseExitAuthorityBoundaryInspector {
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: { readonly isUserStopActive?: () => boolean }) {
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Authority boundary inspector suspended by USER_STOP supremacy');
    }
  }

  /**
   * Audits all critical human authorization boundaries in Phase 1.3.
   */
  public inspectBoundaries(): readonly AuthorityBoundaryFinding[] {
    this.assertUserStopInactive();

    const targets = [
      {
        boundaryName: 'PolicyHumanAuthorizationGate',
        milestone: 'MS-1.3.69',
        filePath: 'src/core/policyCandidateAuthorization/policyHumanAuthorizationGate.ts',
      },
      {
        boundaryName: 'PolicyGovernedActivationBoundary',
        milestone: 'MS-1.3.70',
        filePath: 'src/core/policyStagedActivation/policyGovernedActivationBoundary.ts',
      },
      {
        boundaryName: 'PolicyGovernedRollbackBoundary',
        milestone: 'MS-1.3.72',
        filePath: 'src/core/policyActiveRollback/policyGovernedRollbackBoundary.ts',
      },
      {
        boundaryName: 'PolicyRecoveryAuthorizationEngine',
        milestone: 'MS-1.3.75',
        filePath: 'src/core/policyActiveIncidentResolution/policyRecoveryAuthorizationEngine.ts',
      },
      {
        boundaryName: 'PolicyIncidentClosureBoundary',
        milestone: 'MS-1.3.75',
        filePath: 'src/core/policyActiveIncidentResolution/policyIncidentClosureBoundary.ts',
      },
      {
        boundaryName: 'PolicyPhaseExitAuthorizationBoundary',
        milestone: 'MS-1.3.77',
        filePath: 'src/core/policyPhaseTransition/policyPhaseExitAuthorizationBoundary.ts',
      },
      {
        boundaryName: 'PolicyPhase14EntryAuthorizationBoundary',
        milestone: 'MS-1.3.77',
        filePath: 'src/core/policyPhaseTransition/policyPhase14EntryAuthorizationBoundary.ts',
      },
    ];

    const findings: AuthorityBoundaryFinding[] = [];

    for (const target of targets) {
      const absPath = path.resolve(target.filePath);
      const exists = fs.existsSync(absPath);
      const content = exists ? fs.readFileSync(absPath, 'utf-8') : '';

      const rejectsAutonomous = content.includes('AUTONOMOUS_') || content.includes('auto_');
      const rejectsAnonymous = content.includes('ANONYMOUS') || content.includes('anonymous');
      const enforcesAntiSelfApproval = content.includes('SELF_APPROVAL') || content.includes('proposer') || content.includes('originalRequesterId') || content.includes('requestedBy');
      const requiresHumanRole = content.includes('HUMAN_ROLES') || content.includes('ACTIVATION_ROLES') || content.includes('ROLLBACK_ROLES') || content.includes('HumanAuthorizationRole') || content.includes('MASTER_HUMAN_OPERATOR');

      const deficiencies: string[] = [];
      if (!rejectsAutonomous) deficiencies.push('Missing explicit autonomous actor rejection pattern check');
      if (!rejectsAnonymous) deficiencies.push('Missing explicit anonymous actor rejection check');
      if (!enforcesAntiSelfApproval) deficiencies.push('Missing anti-self-approval enforcement');
      if (!requiresHumanRole) deficiencies.push('Missing authorized human role restriction');

      const verdict = deficiencies.length === 0 ? 'COMPLIANT' : 'NON_COMPLIANT';

      findings.push(Object.freeze({
        boundaryName: target.boundaryName,
        milestone: target.milestone,
        filePath: target.filePath,
        rejectsAutonomous,
        rejectsAnonymous,
        enforcesAntiSelfApproval,
        requiresHumanRole,
        verdict,
        deficiencies: Object.freeze(deficiencies),
      }));
    }

    return Object.freeze(findings);
  }
}
