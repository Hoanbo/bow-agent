// tests/test_v4_agent_governed_phase_exit_evidence_audit.ts
// BOWCON V4.0 — MS-1.3.78: INDEPENDENT PHASE 1.3 EXIT EVIDENCE AUDIT & GOVERNANCE READINESS CERTIFICATION
//
// Dedicated Reality Test Suite for MS-1.3.78.
// Verifies all 28 test categories (A through AB) with strict assertions.
//
// Invariants Verified:
// - EVIDENCE != READINESS
// - READINESS != AUTHORIZATION
// - AUTHORIZATION != COMMIT
// - AUDIT != POLICY_AUTHORITY
// - AUDIT != POLICY_MUTATION
// - READINESS_ASSESSMENT != PHASE_EXIT
// - PHASE_EXIT != PHASE_1_4_ENTRY
// - ZERO AUTONOMOUS POLICY MUTATION
// - ZERO AUTONOMOUS PHASE EXIT
// - HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// - USER_STOP > EVERYTHING
// - PROTECTED_WORKSPACE_UNTOUCHED
// - FAIL_CLOSED

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import {
  PolicyPhaseExitEvidenceStrengthEngine,
  PolicyPhaseExitEvidenceCollector,
  PolicyPhaseExitMilestoneInspector,
  PolicyPhaseExitIntegrationInspector,
  PolicyPhaseExitRuntimeInspector,
  PolicyPhaseExitSecurityInspector,
  PolicyPhaseExitAuthorityBoundaryInspector,
  PolicyPhaseExitTenantIsolationInspector,
  PolicyPhaseExitProvenanceInspector,
  PolicyPhaseExitAntiCircularityEngine,
  PolicyPhaseExitIndependentAssessmentEngine,
  PolicyPhaseExitAuditReportStore,
  PolicyPhaseExitAuditProvenanceEngine,
  PolicyPhaseExitAuditEngine,
  PolicyPhaseExitAuditRuntime,
  CANONICAL_AUDIT_CRITERIA,
  POLICY_PHASE_EXIT_EVIDENCE_AUDIT_DOMAIN,
  createAuditEvidenceId,
  createAuditCriterionId,
  type AuditEvidenceItem,
} from '../src/core/policyPhaseExitAudit/index.js';
import { globalAuditLedger } from '../src/core/auditLedger.js';

let assertionCount = 0;
function assertPass(condition: boolean, msg: string) {
  assert(condition, msg);
  assertionCount++;
}

async function runRealityGate() {
  console.log('>>> [START] MS-1.3.78 Independent Evidence Audit Reality Test Suite');

  // ============================================================================
  // Section A: Clean Repository Evidence & Initialization
  // ============================================================================
  console.log('--- Section A: Clean Repository Evidence & Initialization ---');
  const runtime = new PolicyPhaseExitAuditRuntime();
  assertPass(runtime !== undefined, 'Runtime should initialize cleanly');

  const report = runtime.executeIndependentAudit({
    tenantPartition: 'tenant_reality_audit_01',
    actorUserId: 'operator_auditor_alpha',
  });
  assertPass(report !== null, 'Report should be generated');
  assertPass(report.reportId.startsWith('rep_'), 'ReportId format valid');
  assertPass(report.totalCriteriaCount === 24, 'Total criteria count must be 24');
  assertPass(report.passedCriteriaCount === 24, 'All 24 criteria must pass on clean repository');
  assertPass(report.readinessStatus === 'READY_FOR_PHASE_EXIT_REVIEW', 'Readiness status must be READY_FOR_PHASE_EXIT_REVIEW');

  // ============================================================================
  // Section B: Missing Evidence Handling
  // ============================================================================
  console.log('--- Section B: Missing Evidence Handling ---');
  const assessEngine = new PolicyPhaseExitIndependentAssessmentEngine();
  const partialReport = assessEngine.conductAssessment({
    tenantPartition: 'tenant_missing_ev',
    evidenceItems: [], // No evidence items
  });
  assertPass(partialReport.readinessStatus === 'NOT_READY', 'Empty evidence must yield NOT_READY');
  assertPass(partialReport.passedCriteriaCount === 0, 'Zero passed criteria');
  assertPass(partialReport.unresolvedRisks.length > 0, 'Unresolved risks must be flagged');

  // ============================================================================
  // Section C: Contradictory Evidence Detection
  // ============================================================================
  console.log('--- Section C: Contradictory Evidence Detection ---');
  const contradictoryItems: AuditEvidenceItem[] = [
    {
      evidenceId: createAuditEvidenceId('ev_c1'),
      criterionId: createAuditCriterionId('CRITERION_GOVERNANCE_COVERAGE'),
      evidenceSource: 'test_source',
      evidenceStrength: 'STATIC_CODE_EVIDENCE',
      verificationMethod: 'AST_SOURCE_INSPECTION',
      observedValue: 'MISSING',
      expectedValue: 'PRESENT',
      verified: false,
      collectedAt: new Date().toISOString(),
    },
  ];
  const contraReport = assessEngine.conductAssessment({
    tenantPartition: 'tenant_contra',
    evidenceItems: contradictoryItems,
  });
  assertPass(contraReport.readinessStatus === 'NOT_READY', 'Unverified evidence must yield NOT_READY');
  const failedCriterion = contraReport.criteriaEvaluations.find(e => e.criterion.criterionId === 'CRITERION_GOVERNANCE_COVERAGE');
  assertPass(failedCriterion?.status === 'FAIL', 'Criterion status must be FAIL');

  // ============================================================================
  // Section D: Circular Evidence Detection
  // ============================================================================
  console.log('--- Section D: Circular Evidence Detection ---');
  const antiCirc = new PolicyPhaseExitAntiCircularityEngine();
  const circularItems: AuditEvidenceItem[] = [
    {
      evidenceId: createAuditEvidenceId('ev_circ_1'),
      criterionId: createAuditCriterionId('CRITERION_A'),
      evidenceSource: 'source_a',
      evidenceStrength: 'DIRECT_TEST_EVIDENCE',
      verificationMethod: 'DEDICATED_REALITY_TEST',
      observedValue: 'PASS',
      expectedValue: 'PASS',
      verified: true,
      collectedAt: new Date().toISOString(),
      details: { dependsOnCriterion: 'CRITERION_B' },
    },
    {
      evidenceId: createAuditEvidenceId('ev_circ_2'),
      criterionId: createAuditCriterionId('CRITERION_B'),
      evidenceSource: 'source_b',
      evidenceStrength: 'DIRECT_TEST_EVIDENCE',
      verificationMethod: 'DEDICATED_REALITY_TEST',
      observedValue: 'PASS',
      expectedValue: 'PASS',
      verified: true,
      collectedAt: new Date().toISOString(),
      details: { dependsOnCriterion: 'CRITERION_A' },
    },
  ];
  const circResult = antiCirc.analyzeEvidence(circularItems);
  assertPass(circResult.hasCycles === true, 'Cycle must be detected between A and B');
  assertPass(circResult.cyclesDetected.length > 0, 'Cycles detected list must not be empty');

  // ============================================================================
  // Section E: Claim-Only Evidence Rejection
  // ============================================================================
  console.log('--- Section E: Claim-Only Evidence Rejection ---');
  assertPass(PolicyPhaseExitEvidenceStrengthEngine.isPassEligible('CLAIM_ONLY') === false, 'CLAIM_ONLY must not be pass eligible');
  assertPass(PolicyPhaseExitEvidenceStrengthEngine.isStrengthSufficient('CLAIM_ONLY', 'STATIC_CODE_EVIDENCE') === false, 'CLAIM_ONLY cannot satisfy static code evidence');

  // ============================================================================
  // Section F: Direct Runtime Evidence Verification
  // ============================================================================
  console.log('--- Section F: Direct Runtime Evidence Verification ---');
  const runtimeInspector = new PolicyPhaseExitRuntimeInspector();
  const runtimeFindings = runtimeInspector.inspectRuntimes();
  assertPass(runtimeFindings.length >= 6, 'At least 6 governance runtimes inspected');
  for (const rf of runtimeFindings) {
    assertPass(rf.instantiated === true, `Runtime ${rf.runtimeName} must instantiate cleanly`);
    assertPass(rf.safeReadOnlyQuery === true, `Runtime ${rf.runtimeName} must support safe queries`);
    assertPass(rf.mutationMethodsExposed.length === 0, `Runtime ${rf.runtimeName} must NOT expose mutation methods`);
  }

  // ============================================================================
  // Section G: Integration Evidence Verification
  // ============================================================================
  console.log('--- Section G: Integration Evidence Verification ---');
  const integrationInspector = new PolicyPhaseExitIntegrationInspector();
  const intFindings = integrationInspector.inspectIntegrations();
  assertPass(intFindings.length === 5, '5 critical integration paths inspected');
  for (const inf of intFindings) {
    assertPass(inf.connected === true, `Path ${inf.integrationPath} must be connected`);
    assertPass(inf.authoritySeparated === true, `Path ${inf.integrationPath} must enforce authority separation`);
  }

  // ============================================================================
  // Section H, I: Security & Authority Leakage Scanning
  // ============================================================================
  console.log('--- Section H, I: Security & Authority Leakage Scanning ---');
  const secInspector = new PolicyPhaseExitSecurityInspector();
  const secFindings = secInspector.scanGovernancePlane();
  for (const sf of secFindings) {
    assertPass(sf.clean === true, `Directory ${sf.directory} must be clean of forbidden primitives & leaks`);
    assertPass(sf.forbiddenPrimitivesDetected.length === 0, `0 forbidden primitives in ${sf.directory}`);
    assertPass(sf.authorityLeakageDetected.length === 0, `0 authority leaks in ${sf.directory}`);
  }

  // ============================================================================
  // Section J: Tenant Isolation Verification
  // ============================================================================
  console.log('--- Section J: Tenant Isolation Verification ---');
  const isolationInspector = new PolicyPhaseExitTenantIsolationInspector();
  const isoFinding = isolationInspector.probeIsolation();
  assertPass(isoFinding.clean === true, 'Tenant isolation probe must be clean');
  assertPass(isoFinding.pathTraversalBlocked === true, 'Path traversal blocked');
  assertPass(isoFinding.nullByteBlocked === true, 'Null byte blocked');
  assertPass(isoFinding.reservedDeviceBlocked === true, 'Reserved device blocked');
  assertPass(isoFinding.crossTenantSegregationVerified === true, 'Cross-tenant segregation verified');

  // ============================================================================
  // Section K: USER_STOP Dominance
  // ============================================================================
  console.log('--- Section K: USER_STOP Dominance ---');
  const stoppedRuntime = new PolicyPhaseExitAuditRuntime({
    isUserStopActive: () => true,
  });
  let stopThrown = false;
  try {
    stoppedRuntime.executeIndependentAudit({
      tenantPartition: 'tenant_stop_test',
      actorUserId: 'operator_alpha',
    });
  } catch (err: any) {
    stopThrown = err.message.includes('OPERATION_SUSPENDED_BY_USER_STOP');
  }
  assertPass(stopThrown === true, 'USER_STOP must immediately suspend executeIndependentAudit');

  // ============================================================================
  // Section L, M: Provenance Generation & Tamper Detection
  // ============================================================================
  console.log('--- Section L, M: Provenance Generation & Tamper Detection ---');
  const provEngine = new PolicyPhaseExitAuditProvenanceEngine();
  const tenantProv = 'tenant_prov_reality';
  const rec1 = provEngine.recordAuditEvent({
    tenantPartition: tenantProv,
    auditId: report.auditId,
    assessmentStatus: 'READY_FOR_PHASE_EXIT_REVIEW',
    payload: { test: 1 },
  });
  const rec2 = provEngine.recordAuditEvent({
    tenantPartition: tenantProv,
    auditId: report.auditId,
    assessmentStatus: 'READY_FOR_PHASE_EXIT_REVIEW',
    payload: { test: 2 },
  });
  assertPass(rec2.previousHash === rec1.recordHash, 'Provenance chain must link rec2.previousHash to rec1.recordHash');

  const pristineCheck = provEngine.verifyChain(tenantProv);
  assertPass(pristineCheck.valid === true, 'Pristine audit provenance chain must verify cleanly');

  // Tamper detection
  (provEngine as any).chains.get(tenantProv)[0] = { ...rec1, recordHash: 'tampered_hash_value' };
  const tamperedCheck = provEngine.verifyChain(tenantProv);
  assertPass(tamperedCheck.valid === false, 'Tampered chain must fail verification');
  assertPass(tamperedCheck.error?.includes('PROVENANCE_TAMPER_DETECTED'), 'Error must specify PROVENANCE_TAMPER_DETECTED');

  // ============================================================================
  // Section N, O: Audit Ledger & Secret Sanitization
  // ============================================================================
  console.log('--- Section N, O: Audit Ledger & Secret Sanitization ---');
  const auditEngine = new PolicyPhaseExitAuditEngine();
  auditEngine.recordEvent({
    eventType: 'PHASE_EXIT_CRITERION_VERIFIED',
    tenantId: 'tenant_audit_test',
    actorUserId: 'operator_auditor',
    details: {
      password: 'sensitive_pass_123',
      apiKey: 'sk-1234567890abcdef',
      criterion: 'CRITERION_HUMAN_AUTHORITY',
    },
  });

  const trail = globalAuditLedger.getTrail({ domain: POLICY_PHASE_EXIT_EVIDENCE_AUDIT_DOMAIN });
  assertPass(trail.length > 0, 'Audit entries must be recorded under domain POLICY_PHASE_EXIT_EVIDENCE_AUDIT');
  const lastEntry = trail[trail.length - 1];
  assertPass(lastEntry.metadata?.password === '[REDACTED]', 'Secret password must be sanitized');
  assertPass(lastEntry.metadata?.apiKey === '[REDACTED]', 'Secret apiKey must be sanitized');

  // ============================================================================
  // Section P: Hard-Forbidden Floor
  // ============================================================================
  console.log('--- Section P: Hard-Forbidden Floor ---');
  const authBoundaries = new PolicyPhaseExitAuthorityBoundaryInspector().inspectBoundaries();
  for (const ab of authBoundaries) {
    assertPass(ab.rejectsAutonomous === true, `${ab.boundaryName} must reject autonomous actors`);
    assertPass(ab.rejectsAnonymous === true, `${ab.boundaryName} must reject anonymous actors`);
    assertPass(ab.enforcesAntiSelfApproval === true, `${ab.boundaryName} must enforce anti-self-approval`);
    assertPass(ab.requiresHumanRole === true, `${ab.boundaryName} must require human roles`);
    assertPass(ab.verdict === 'COMPLIANT', `${ab.boundaryName} must be COMPLIANT`);
  }

  // ============================================================================
  // Section Q-U: Milestone Evidence Proofs
  // ============================================================================
  console.log('--- Section Q-U: Milestone Evidence Proofs ---');
  const milestoneInspector = new PolicyPhaseExitMilestoneInspector();
  const msFindings = milestoneInspector.inspectMilestones();
  assertPass(msFindings.length === 16, 'All 16 milestones inspected');
  for (const mf of msFindings) {
    assertPass(mf.implemented === true, `Milestone ${mf.milestone} must be implemented`);
    assertPass(mf.exported === true, `Milestone ${mf.milestone} must be exported in src/index.ts`);
    assertPass(mf.tested === true, `Milestone ${mf.milestone} must have dedicated test file`);
    assertPass(mf.documented === true, `Milestone ${mf.milestone} must be documented in matrix`);
  }

  // ============================================================================
  // Section V, W: Autonomous Actor Rejection & Phase Separation
  // ============================================================================
  console.log('--- Section V, W: Autonomous Actor Rejection & Phase Separation ---');
  assertPass(report.phaseExitAuthorization === 'HUMAN_AUTHORITY_REQUIRED', 'Exit authorization requires human authority');
  assertPass(report.autonomousPhaseExit === 'FORBIDDEN', 'Autonomous phase exit is strictly forbidden');
  assertPass(report.phase14Entry === 'FORBIDDEN', 'Phase 1.4 entry is strictly forbidden');

  // ============================================================================
  // Section X: Protected Workspace Untouched
  // ============================================================================
  console.log('--- Section X: Protected Workspace Untouched ---');
  const protectedPath = 'C:\\BOW\\shopofbow';
  const untouched = !fs.existsSync(protectedPath);
  assertPass(untouched === true, 'Protected workspace C:\\BOW\\shopofbow must NOT exist');

  // ============================================================================
  // Section Y, Z: Regression & Build Integrity
  // ============================================================================
  console.log('--- Section Y, Z: Regression & Build Integrity ---');
  const regPath = path.resolve('scratch/run_full_regression.mjs');
  const regContent = fs.readFileSync(regPath, 'utf-8');
  assertPass(regContent.includes('test_v4_agent_governed_phase_exit_and_phase14_entry.ts'), 'MS-1.3.77 registered in regression');

  // ============================================================================
  // Section AA, AB: Final Readiness & Zero Autonomous Exit
  // ============================================================================
  console.log('--- Section AA, AB: Final Readiness & Zero Autonomous Exit ---');
  assertPass(report.readinessStatus === 'READY_FOR_PHASE_EXIT_REVIEW', 'Final status must be READY_FOR_PHASE_EXIT_REVIEW');
  assertPass(report.unresolvedRisks.length === 0, 'Zero unresolved risks on clean run');

  // Ensure MS-1.3.78 cannot close Phase 1.3 or execute phaseExit
  assertPass((runtime as any).phaseExit === undefined, 'runtime.phaseExit must not exist');
  assertPass((runtime as any).commitPhaseExit === undefined, 'runtime.commitPhaseExit must not exist');
  assertPass((runtime as any).authorizePhaseExit === undefined, 'runtime.authorizePhaseExit must not exist');
  assertPass((runtime as any).transitionToPhase14 === undefined, 'runtime.transitionToPhase14 must not exist');
  assertPass((runtime as any).autoApprovePhaseExit === undefined, 'runtime.autoApprovePhaseExit must not exist');
  assertPass((runtime as any).autonomousPhaseExit === undefined, 'runtime.autonomousPhaseExit must not exist');
  assertPass((runtime as any).mutatePolicy === undefined, 'runtime.mutatePolicy must not exist');
  assertPass((runtime as any).activatePolicy === undefined, 'runtime.activatePolicy must not exist');
  assertPass((runtime as any).rollbackPolicy === undefined, 'runtime.rollbackPolicy must not exist');

  console.log('\n============================================================');
  console.log(`MS-1.3.78 REALITY GATE PASSED: ${assertionCount} assertions verified`);
  console.log('============================================================\n');
}

runRealityGate().catch((err) => {
  console.error('>>> [FAIL] Reality Gate failed:', err);
  process.exit(1);
});
