// src/core/policyPhaseExitAudit/policyPhaseExitIntegrationInspector.ts
// BOWCON V4.0 — MS-1.3.78: INDEPENDENT PHASE 1.3 EXIT EVIDENCE AUDIT & GOVERNANCE READINESS CERTIFICATION
//
// Integration & Governance Separation Inspector (Component 888).
// Verifies cross-module integration paths and enforces strict authority decoupling across Phase 1.3.
// Strictly read-only; alters ZERO state.
//
// Core Authority Invariants:
// - GOVERNANCE_SEPARATION_ENFORCED
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED

import fs from 'node:fs';
import path from 'node:path';

export interface IntegrationFinding {
  readonly integrationPath: string;
  readonly sourceMilestone: string;
  readonly targetMilestone: string;
  readonly connected: boolean;
  readonly authoritySeparated: boolean;
  readonly issues: readonly string[];
}

export class PolicyPhaseExitIntegrationInspector {
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: { readonly isUserStopActive?: () => boolean }) {
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Integration inspector suspended by USER_STOP supremacy');
    }
  }

  /**
   * Inspects all critical Phase 1.3 integration paths for linkage and authority separation.
   */
  public inspectIntegrations(): readonly IntegrationFinding[] {
    this.assertUserStopInactive();

    const findings: IntegrationFinding[] = [];

    // Path 1: MS-1.3.69 Candidate Authorization -> MS-1.3.70 Staged Activation
    const path1Source = path.resolve('src/core/policyStagedActivation/policyGovernedActivationBoundary.ts');
    const path1Content = fs.existsSync(path1Source) ? fs.readFileSync(path1Source, 'utf-8') : '';
    const path1Connected = path1Content.includes('policyCandidateAuthorization') || path1Content.includes('CandidateAuthorizationRecord');
    const path1Separated = !path1Content.includes('authorizeCandidate(');
    findings.push(Object.freeze({
      integrationPath: 'CANDIDATE_AUTH_TO_STAGED_ACTIVATION',
      sourceMilestone: 'MS-1.3.69',
      targetMilestone: 'MS-1.3.70',
      connected: path1Connected,
      authoritySeparated: path1Separated,
      issues: path1Connected && path1Separated ? [] : ['Integration path 1 authority decoupling violation'],
    }));

    // Path 2: MS-1.3.70 Staged Activation -> MS-1.3.71 Runtime Synchronization
    const path2Source = path.resolve('src/core/policyActiveRuntime/policyActiveRuntimeSyncEngine.ts');
    const path2Content = fs.existsSync(path2Source) ? fs.readFileSync(path2Source, 'utf-8') : '';
    const path2Connected = path2Content.includes('ActivePolicySnapshot') || path2Content.includes('policyStagedActivation') || path2Content.includes('PolicyActiveRuntimeTypes');
    const path2Separated = !path2Content.includes('activatePolicy(');
    findings.push(Object.freeze({
      integrationPath: 'STAGED_ACTIVATION_TO_RUNTIME_SYNC',
      sourceMilestone: 'MS-1.3.70',
      targetMilestone: 'MS-1.3.71',
      connected: path2Connected,
      authoritySeparated: path2Separated,
      issues: path2Connected && path2Separated ? [] : ['Integration path 2 authority decoupling violation'],
    }));

    // Path 3: MS-1.3.75 Incident Resolution -> MS-1.3.72 Rollback Execution Handoff
    const path3Source = path.resolve('src/core/policyActiveIncidentResolution/policyIncidentRecoveryHandoffEngine.ts');
    const path3Content = fs.existsSync(path3Source) ? fs.readFileSync(path3Source, 'utf-8') : '';
    const path3Connected = path3Content.includes('PolicyActiveRollbackRuntime') && (path3Content.includes('commitRecovery') || path3Content.includes('requestRecovery'));
    const path3Separated = !path3Content.includes('mutatePolicyDirectly');
    findings.push(Object.freeze({
      integrationPath: 'INCIDENT_RESOLUTION_TO_ROLLBACK_HANDOFF',
      sourceMilestone: 'MS-1.3.75',
      targetMilestone: 'MS-1.3.72',
      connected: path3Connected,
      authoritySeparated: path3Separated,
      issues: path3Connected && path3Separated ? [] : ['Integration path 3 authority decoupling violation'],
    }));

    // Path 4: MS-1.3.76 Governance Readiness -> MS-1.3.77 Phase Exit & 1.4 Entry Boundary
    const path4Source = path.resolve('src/core/policyPhaseTransition/policyPhaseExitReadinessResolver.ts');
    const path4Content = fs.existsSync(path4Source) ? fs.readFileSync(path4Source, 'utf-8') : '';
    const path4Connected = path4Content.includes('policyGovernanceReadiness') && path4Content.includes('ReadinessAssessmentReport');
    const path4Separated = !path4Content.includes('commitPhaseExit');
    findings.push(Object.freeze({
      integrationPath: 'READINESS_ASSESSMENT_TO_PHASE_TRANSITION',
      sourceMilestone: 'MS-1.3.76',
      targetMilestone: 'MS-1.3.77',
      connected: path4Connected,
      authoritySeparated: path4Separated,
      issues: path4Connected && path4Separated ? [] : ['Integration path 4 authority decoupling violation'],
    }));

    // Path 5: MS-1.3.77 Phase Exit Commit != Phase 1.4 Entry
    const path5Source = path.resolve('src/core/policyPhaseTransition/policyPhase14EntryTransitionEngine.ts');
    const path5Content = fs.existsSync(path5Source) ? fs.readFileSync(path5Source, 'utf-8') : '';
    const path5Separated = path5Content.includes('DIRECT_JUMP_REJECTED') && path5Content.includes('PHASE_1_3_EXIT_COMMITTED');
    findings.push(Object.freeze({
      integrationPath: 'PHASE_EXIT_TO_PHASE_14_ENTRY_SEPARATION',
      sourceMilestone: 'MS-1.3.77',
      targetMilestone: 'MS-1.3.77_ENTRY',
      connected: true,
      authoritySeparated: path5Separated,
      issues: path5Separated ? [] : ['Phase 1.3 exit and Phase 1.4 entry are not strictly decoupled'],
    }));

    return Object.freeze(findings);
  }
}
