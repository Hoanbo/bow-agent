
// tests/test_v4_phase14_exit_boundary_independent_governance_audit.ts
// BOWCON V4.0 — MS-1.4.13: PHASE 1.4 EXIT BOUNDARY & INDEPENDENT GOVERNANCE AUDIT
// Dedicated Regression Suite #94
// Verifies Components 974–980: Independent Audit, Reconciler, Gate, Runtime, Criteria, False-Positive Overrides & USER_STOP

import assert from 'node:assert';
import crypto from 'node:crypto';
import {
  // Types & Errors (974)
  Phase14ExitBoundaryError,
  Phase14AuditAbortedError,
  Phase14ValidationError,
  Phase14SecurityError,
  CANONICAL_EXIT_CRITERIA_METADATA,
  deepFreeze,
  // Gate (978)
  Phase14ExitBoundaryGate,
  // Evidence Collector (975)
  IndependentEvidenceCollector,
  // Reconciler (976)
  Phase14EvidenceReconciler,
  // Audit Engine (977)
  Phase14GovernanceAuditEngine,
  // Runtime (979)
  Phase14ExitCertificateRuntime,
} from '../src/core/phase14ExitBoundary/index.js';

import { MasterHumanAuthority } from '../src/core/authority/masterHumanAuthority.js';
import { Phase14ReadinessReport } from '../src/core/phase14Readiness/phase14ReadinessTypes.js';

let passedAssertions = 0;
function expect(condition: boolean, msg: string) {
  assert(condition, `[ASSERTION FAILED] ${msg}`);
  passedAssertions++;
}

async function runAllTests() {
  console.log('================================================================================');
  console.log('STARTING MS-1.4.13: PHASE 1.4 EXIT BOUNDARY & INDEPENDENT GOVERNANCE AUDIT TESTS');
  console.log('================================================================================\n');

  const tenantA = 'tenant_exit_audit_alpha';
  const tenantB = 'tenant_exit_audit_beta';

  // ---------------------------------------------------------------------------
  // SECTION 1: COMPONENT TAXONOMY & ARCHITECTURE
  // ---------------------------------------------------------------------------
  console.log('--- SECTION 1: Subsystem Architecture & Component Taxonomy ---');

  expect(typeof Phase14ExitBoundaryGate === 'function', 'Component 978 Phase14ExitBoundaryGate exists');
  expect(typeof IndependentEvidenceCollector === 'function', 'Component 975 IndependentEvidenceCollector exists');
  expect(typeof Phase14EvidenceReconciler === 'function', 'Component 976 Phase14EvidenceReconciler exists');
  expect(typeof Phase14GovernanceAuditEngine === 'function', 'Component 977 Phase14GovernanceAuditEngine exists');
  expect(typeof Phase14ExitCertificateRuntime === 'function', 'Component 979 Phase14ExitCertificateRuntime exists');

  const allCriteriaKeys = Object.keys(CANONICAL_EXIT_CRITERIA_METADATA);
  expect(allCriteriaKeys.length === 12, 'Exactly 12 exit criteria in metadata taxonomy');
  expect(CANONICAL_EXIT_CRITERIA_METADATA['CRIT-1.4-01'].name === 'Multi-Step Task Completion', 'CRIT-1.4-01 named correctly');
  expect(CANONICAL_EXIT_CRITERIA_METADATA['CRIT-1.4-11'].name === 'Full Regression Integrity', 'CRIT-1.4-11 named correctly');
  expect(CANONICAL_EXIT_CRITERIA_METADATA['CRIT-1.4-12'].name === 'Protected Workspace Untouched', 'CRIT-1.4-12 named correctly');

  // ---------------------------------------------------------------------------
  // SECTION 2: INDEPENDENT EVIDENCE COLLECTOR (COMPONENT 975)
  // ---------------------------------------------------------------------------
  console.log('--- SECTION 2: Independent Evidence Collector ---');

  const gate = new Phase14ExitBoundaryGate();
  const collector = new IndependentEvidenceCollector(gate);

  const evidence = await collector.collectEvidence({
    tenantId: tenantA,
    overrideFilesystemCheck: () => false, // shopofbow untouched
  });

  expect(Array.isArray(evidence), 'Evidence collection returns array');
  expect(evidence.length >= 4, 'Collector gathers at least 4 independent evidence streams');

  const sources = evidence.map(e => e.source);
  expect(sources.includes('FILESYSTEM_PROBE'), 'Filesystem probe evidence collected');
  expect(sources.includes('AUDIT_LEDGER'), 'Audit ledger evidence collected');
  expect(sources.includes('REGRESSION_RECORD'), 'Regression record evidence collected');
  expect(sources.includes('SANITY_SCAN'), 'Sanity scan evidence collected');

  for (const item of evidence) {
    expect(typeof item.evidenceId === 'string' && item.evidenceId.length > 0, 'Valid evidenceId');
    expect(item.tenantId === tenantA, 'Evidence tenant isolation preserved');
    expect(typeof item.payloadHash === 'string' && item.payloadHash.length === 64, 'SHA-256 payload hash');
    expect(Object.isFrozen(item), 'Evidence item is frozen');
  }

  // ---------------------------------------------------------------------------
  // SECTION 3: 12 CRITERIA INDEPENDENT RECONCILIATION (COMPONENT 976)
  // ---------------------------------------------------------------------------
  console.log('--- SECTION 3: 12 Criteria Independent Reconciliation ---');

  const reconciler = new Phase14EvidenceReconciler(gate);

  const outcomeClean = reconciler.reconcile({
    tenantId: tenantA,
    evidence,
  });

  expect(outcomeClean.criteriaResults.length === 12, 'Reconciliation evaluates all 12 criteria');
  expect(outcomeClean.passedCount === 12, 'All 12 criteria pass under clean persistent evidence');
  expect(outcomeClean.allPassed === true, 'allPassed flag true when 12/12 pass');
  expect(outcomeClean.contradictions.length === 0, 'Zero contradictions in clean evidence set');

  // Verify individual criterion evaluations
  const c01 = outcomeClean.criteriaResults.find(c => c.criterionId === 'CRIT-1.4-01')!;
  expect(c01.status === 'PASS' && c01.score === 1.0, 'CRIT-1.4-01 PASS');

  const c02 = outcomeClean.criteriaResults.find(c => c.criterionId === 'CRIT-1.4-02')!;
  expect(c02.status === 'PASS' && c02.score === 1.0, 'CRIT-1.4-02 PASS with zero unauth tool calls');

  const c03 = outcomeClean.criteriaResults.find(c => c.criterionId === 'CRIT-1.4-03')!;
  expect(c03.status === 'PASS' && c03.score === 1.0, 'CRIT-1.4-03 PASS (zero unhandled denials)');

  const c04 = outcomeClean.criteriaResults.find(c => c.criterionId === 'CRIT-1.4-04')!;
  expect(c04.status === 'PASS' && c04.score === 1.0, 'CRIT-1.4-04 PASS (inference budgets enforced)');

  const c05 = outcomeClean.criteriaResults.find(c => c.criterionId === 'CRIT-1.4-05')!;
  expect(c05.status === 'PASS' && c05.score === 1.0, 'CRIT-1.4-05 PASS (tool execution isolation)');

  const c06 = outcomeClean.criteriaResults.find(c => c.criterionId === 'CRIT-1.4-06')!;
  expect(c06.status === 'PASS' && c06.score === 1.0, 'CRIT-1.4-06 PASS (empirical reality verification)');

  const c07 = outcomeClean.criteriaResults.find(c => c.criterionId === 'CRIT-1.4-07')!;
  expect(c07.status === 'PASS' && c07.score === 1.0, 'CRIT-1.4-07 PASS (memory pollution invariant)');

  const c08 = outcomeClean.criteriaResults.find(c => c.criterionId === 'CRIT-1.4-08')!;
  expect(c08.status === 'PASS' && c08.score === 1.0, 'CRIT-1.4-08 PASS (complete distributed traces)');

  const c09 = outcomeClean.criteriaResults.find(c => c.criterionId === 'CRIT-1.4-09')!;
  expect(c09.status === 'PASS' && c09.score === 1.0, 'CRIT-1.4-09 PASS (USER_STOP preemption latency)');

  const c10 = outcomeClean.criteriaResults.find(c => c.criterionId === 'CRIT-1.4-10')!;
  expect(c10.status === 'PASS' && c10.score === 1.0, 'CRIT-1.4-10 PASS (multi-tenant task isolation)');

  const c11 = outcomeClean.criteriaResults.find(c => c.criterionId === 'CRIT-1.4-11')!;
  expect(c11.status === 'PASS' && c11.score === 1.0, 'CRIT-1.4-11 PASS (93 suites baseline verified)');

  const c12 = outcomeClean.criteriaResults.find(c => c.criterionId === 'CRIT-1.4-12')!;
  expect(c12.status === 'PASS' && c12.score === 1.0, 'CRIT-1.4-12 PASS (shopofbow untouched verified)');

  // ---------------------------------------------------------------------------
  // SECTION 4: FALSE-POSITIVE DISCOVERY GUARANTEE
  // ---------------------------------------------------------------------------
  console.log('--- SECTION 4: False-Positive Discovery Guarantee ---');

  // Create a synthetic MS-1.4.12 report claiming READY_FOR_PHASE_EXIT
  const fakeReadinessReport: Phase14ReadinessReport = {
    reportId: 'rep_fake_readiness_001',
    tenantId: tenantA,
    assessedAtIso: new Date().toISOString(),
    overallStatus: 'READY_FOR_PHASE_EXIT',
    passRatio: 1.0,
    criteriaPassedCount: 12,
    criteriaEvaluations: allCriteriaKeys.map(id => ({
      criterionId: id as any,
      name: CANONICAL_EXIT_CRITERIA_METADATA[id as any].name,
      status: 'PASSED',
      score: 1.0,
      description: 'Synthetic pass claim',
      empiricalEvidence: { claim: 'self-declared' },
      evaluatedAtIso: new Date().toISOString(),
    })),
    chaosScenarios: [],
    provenanceManifest: {
      ms1401TaskLifecycleHash: crypto.createHash('sha256').update('ms1401_seed').digest('hex'),
      ms1402CognitiveHash: crypto.createHash('sha256').update('ms1402_seed').digest('hex'),
      ms1403ContextHash: crypto.createHash('sha256').update('ms1403_seed').digest('hex'),
      ms1404PlanningHash: crypto.createHash('sha256').update('ms1404_seed').digest('hex'),
      ms1405ActionProposalHash: crypto.createHash('sha256').update('ms1405_seed').digest('hex'),
      ms1406ToolAdapterHash: crypto.createHash('sha256').update('ms1406_seed').digest('hex'),
      ms1407RealityVerificationHash: crypto.createHash('sha256').update('ms1407_seed').digest('hex'),
      ms1408DurableCommitHash: crypto.createHash('sha256').update('ms1408_seed').digest('hex'),
      ms1409EpisodicMemoryHash: crypto.createHash('sha256').update('ms1409_seed').digest('hex'),
      ms1410AgentLoopFacadeHash: crypto.createHash('sha256').update('ms1410_seed').digest('hex'),
      ms1411ObservabilityHash: crypto.createHash('sha256').update('ms1411_seed').digest('hex'),
      compositeManifestHash: crypto.createHash('sha256').update('ms1412_composite_seed').digest('hex'),
    },
    summaryNotes: 'Self-declared ready',
  };

  // Scenario 4A: Protected workspace C:\BOW\shopofbow exists in reality
  const taintedEvidenceShop = await collector.collectEvidence({
    tenantId: tenantA,
    overrideFilesystemCheck: () => true, // simulates shopofbow exists!
  });

  const outcomeTaintedShop = reconciler.reconcile({
    tenantId: tenantA,
    evidence: taintedEvidenceShop,
    readinessReport: fakeReadinessReport,
  });

  expect(outcomeTaintedShop.allPassed === false, 'False positive blocked: allPassed is false when shop exists');
  expect(outcomeTaintedShop.contradictions.length > 0, 'Fatal contradiction detected when shop exists');
  const shopContradiction = outcomeTaintedShop.contradictions.find(c => c.criterionId === 'CRIT-1.4-12')!;
  expect(shopContradiction !== undefined, 'CRIT-1.4-12 contradiction explicitly recorded');
  expect(shopContradiction.severity === 'FATAL_CONTRADICTION', 'Contradiction severity is FATAL_CONTRADICTION');

  // Scenario 4B: Audit ledger shows unauthorized tool calls
  const taintedAuditItem = {
    source: 'AUDIT_LEDGER' as const,
    evidenceId: 'ev_tainted_audit_01',
    tenantId: tenantA,
    observedAtIso: new Date().toISOString(),
    payloadHash: 'hash_tainted_audit_01',
    data: {
      ledgerFile: 'mock_audit.jsonl',
      recordsCount: 50,
      hasCorruption: false,
      unauthorizedToolsCount: 2, // 2 unauthorized tool calls!
    },
  };

  const outcomeTaintedAudit = reconciler.reconcile({
    tenantId: tenantA,
    evidence: [taintedAuditItem],
    readinessReport: fakeReadinessReport,
  });

  expect(outcomeTaintedAudit.allPassed === false, 'False positive blocked: allPassed is false when unauth tools exist');
  const auditContradiction = outcomeTaintedAudit.contradictions.find(c => c.criterionId === 'CRIT-1.4-02')!;
  expect(auditContradiction !== undefined, 'CRIT-1.4-02 contradiction explicitly flagged');
  expect(auditContradiction.severity === 'FATAL_CONTRADICTION', 'Audit contradiction is FATAL_CONTRADICTION');

  // Scenario 4C: Tool adapter secret leakage
  const taintedSanityItem = {
    source: 'SANITY_SCAN' as const,
    evidenceId: 'ev_tainted_sanity_01',
    tenantId: tenantA,
    observedAtIso: new Date().toISOString(),
    payloadHash: 'hash_tainted_sanity_01',
    data: {
      sanitizationEffective: false, // Secret leak!
      sanitizerClass: 'DiagnosisSanitizer',
    },
  };

  const outcomeTaintedSanity = reconciler.reconcile({
    tenantId: tenantA,
    evidence: [taintedSanityItem],
    readinessReport: fakeReadinessReport,
  });

  expect(outcomeTaintedSanity.allPassed === false, 'False positive blocked: allPassed false on secret leak');
  const leakContradiction = outcomeTaintedSanity.contradictions.find(c => c.criterionId === 'CRIT-1.4-05')!;
  expect(leakContradiction !== undefined, 'CRIT-1.4-05 contradiction explicitly flagged');

  // Scenario 4D: Regression baseline failure (< 93 suites)
  const taintedRegItem = {
    source: 'REGRESSION_RECORD' as const,
    evidenceId: 'ev_tainted_reg_01',
    tenantId: tenantA,
    observedAtIso: new Date().toISOString(),
    payloadHash: 'hash_tainted_reg_01',
    data: {
      runnerPath: 'scratch/run_full_regression.mjs',
      runnerExists: true,
      totalRegisteredSuites: 80, // Less than 93!
      expectedBaselineSuites: 93,
      baselineSatisfied: false,
    },
  };

  const outcomeTaintedReg = reconciler.reconcile({
    tenantId: tenantA,
    evidence: [taintedRegItem],
    readinessReport: fakeReadinessReport,
  });

  expect(outcomeTaintedReg.allPassed === false, 'False positive blocked: regression deficit detected');
  const regContradiction = outcomeTaintedReg.contradictions.find(c => c.criterionId === 'CRIT-1.4-11')!;
  expect(regContradiction !== undefined, 'CRIT-1.4-11 contradiction explicitly flagged');

  // ---------------------------------------------------------------------------
  // SECTION 5: GOVERNANCE AUDIT ENGINE (COMPONENT 977)
  // ---------------------------------------------------------------------------
  console.log('--- SECTION 5: Governance Audit Engine ---');

  const auditEngine = new Phase14GovernanceAuditEngine(gate);

  const cleanAuditOutcome = await auditEngine.executeAudit({
    tenantId: tenantA,
    readinessReport: fakeReadinessReport,
    overrideFilesystemCheck: () => false,
  });

  expect(cleanAuditOutcome.auditStatus === 'EXIT_READY', 'Audit status EXIT_READY under clean empirical evidence');
  expect(cleanAuditOutcome.reconciliation.allPassed === true, 'All criteria passed independently');
  expect(cleanAuditOutcome.provenanceManifest.isAuthenticProvenanceVerified === true, 'Authentic provenance verified');
  expect(typeof cleanAuditOutcome.provenanceManifest.compositeAuditProvenanceHash === 'string', 'Composite audit provenance hash valid');

  const prov = cleanAuditOutcome.provenanceManifest;
  expect(typeof prov.ms1401TaskLifecycleHash === 'string' && prov.ms1401TaskLifecycleHash.length === 64, 'ms1401 hash valid SHA-256');
  expect(typeof prov.ms1402CognitiveHash === 'string' && prov.ms1402CognitiveHash.length === 64, 'ms1402 hash valid SHA-256');
  expect(typeof prov.ms1403ContextHash === 'string' && prov.ms1403ContextHash.length === 64, 'ms1403 hash valid SHA-256');
  expect(typeof prov.ms1404PlanningHash === 'string' && prov.ms1404PlanningHash.length === 64, 'ms1404 hash valid SHA-256');
  expect(typeof prov.ms1405ActionProposalHash === 'string' && prov.ms1405ActionProposalHash.length === 64, 'ms1405 hash valid SHA-256');
  expect(typeof prov.ms1406ToolAdapterHash === 'string' && prov.ms1406ToolAdapterHash.length === 64, 'ms1406 hash valid SHA-256');
  expect(typeof prov.ms1407RealityVerificationHash === 'string' && prov.ms1407RealityVerificationHash.length === 64, 'ms1407 hash valid SHA-256');
  expect(typeof prov.ms1408DurableCommitHash === 'string' && prov.ms1408DurableCommitHash.length === 64, 'ms1408 hash valid SHA-256');
  expect(typeof prov.ms1409EpisodicMemoryHash === 'string' && prov.ms1409EpisodicMemoryHash.length === 64, 'ms1409 hash valid SHA-256');
  expect(typeof prov.ms1410AgentLoopFacadeHash === 'string' && prov.ms1410AgentLoopFacadeHash.length === 64, 'ms1410 hash valid SHA-256');
  expect(typeof prov.ms1411ObservabilityHash === 'string' && prov.ms1411ObservabilityHash.length === 64, 'ms1411 hash valid SHA-256');
  expect(typeof prov.ms1412ReadinessHash === 'string' && prov.ms1412ReadinessHash.length === 64, 'ms1412 hash valid SHA-256');

  // Now run audit with contradiction:
  const rejectedAuditOutcome = await auditEngine.executeAudit({
    tenantId: tenantA,
    readinessReport: fakeReadinessReport,
    overrideFilesystemCheck: () => true, // Protected workspace exists!
  });

  expect(rejectedAuditOutcome.auditStatus === 'REJECTED', 'Audit status REJECTED when contradiction exists');
  expect(rejectedAuditOutcome.reconciliation.contradictions.length > 0, 'Contradictions preserved in outcome');

  // ---------------------------------------------------------------------------
  // SECTION 6: EXIT CERTIFICATE RUNTIME (COMPONENT 979)
  // ---------------------------------------------------------------------------
  console.log('--- SECTION 6: Exit Certificate Runtime & Master Façade ---');

  const runtime = new Phase14ExitCertificateRuntime();

  // Test 6A: Clean Execution producing EXIT_READY certificate
  const cleanResult = await runtime.runIndependentAudit({
    tenantId: tenantA,
    readinessReport: fakeReadinessReport,
    overrideFilesystemCheck: () => false,
  });

  expect(cleanResult.success === true, 'Clean audit execution succeeds');
  expect(cleanResult.certificate.status === 'EXIT_READY', 'Certificate status is EXIT_READY');
  expect(cleanResult.certificate.tenantId === tenantA, 'Certificate tenant matches');
  expect(cleanResult.certificate.criteriaPassedCount === 12, '12 criteria passed');
  expect(cleanResult.certificate.criteriaTotalCount === 12, '12 total criteria');
  expect(cleanResult.certificate.contradictions.length === 0, 'Zero contradictions');
  expect(typeof cleanResult.certificate.certificateHash === 'string' && cleanResult.certificate.certificateHash.length === 64, 'SHA-256 certificate hash generated');
  expect(cleanResult.certificate.disclaimer === 'NON_AUTHORITATIVE_AUDIT_ONLY_REQUIRES_MASTER_HUMAN_GOVERNANCE_DECISION', 'Non-authoritative disclaimer intact');
  expect(cleanResult.error === null, 'Zero error on clean audit');

  // Test 6B: Tainted Execution producing REJECTED certificate
  const rejectedResult = await runtime.runIndependentAudit({
    tenantId: tenantA,
    readinessReport: fakeReadinessReport,
    overrideFilesystemCheck: () => true, // Protected workspace exists!
  });

  expect(rejectedResult.success === false, 'Tainted audit execution fails');
  expect(rejectedResult.certificate.status === 'REJECTED', 'Certificate status is REJECTED');
  expect(rejectedResult.certificate.contradictions.length > 0, 'Contradictions captured in certificate');
  expect(rejectedResult.error !== null && rejectedResult.error?.code === 'REJECTED', 'Error code is REJECTED');

  // Test 6C: Static factory execution
  const staticResult = await Phase14ExitCertificateRuntime.executeIndependentAudit({
    tenantId: tenantA,
    overrideFilesystemCheck: () => false,
  });
  expect(staticResult.success === true, 'Static factory execution succeeds');
  expect(staticResult.certificate.status === 'EXIT_READY', 'Static factory produces EXIT_READY');

  // ---------------------------------------------------------------------------
  // SECTION 7: 7-CHECKPOINT SYNCHRONOUS USER_STOP PREEMPTION
  // ---------------------------------------------------------------------------
  console.log('--- SECTION 7: 7-Checkpoint Synchronous USER_STOP Preemption ---');

  const authority = new MasterHumanAuthority();
  const governedGate = new Phase14ExitBoundaryGate({ authority });

  // Test that normal execution works when USER_STOP is inactive
  governedGate.assertCheckpoint1_AuditInit(tenantA);
  governedGate.assertCheckpoint2_EvidenceCollection(tenantA);
  governedGate.assertCheckpoint3_EvidenceReconciliation(tenantA);
  governedGate.assertCheckpoint4_CriteriaEvaluation('CRIT-1.4-01', tenantA);
  governedGate.assertCheckpoint5_CertificateConstruction('audit_01', tenantA);
  governedGate.assertCheckpoint6_CertificateSealing('audit_01', tenantA);
  governedGate.assertCheckpoint7_CertificateExport('audit_01', tenantA);
  expect(true, 'All 7 checkpoints pass when USER_STOP is inactive');

  // Trigger USER_STOP
  authority.triggerUserStop('Emergency test stop', 'master_operator');
  expect(authority.isUserStopActive === true, 'USER_STOP is now active');

  // Verify each checkpoint fails closed with Phase14AuditAbortedError
  const testCheckpoint = (fn: () => void, name: string) => {
    let aborted = false;
    try {
      fn();
    } catch (err: any) {
      if (err instanceof Phase14AuditAbortedError) {
        aborted = true;
      }
    }
    expect(aborted, `USER_STOP preemption triggered at ${name}`);
  };

  testCheckpoint(() => governedGate.assertCheckpoint1_AuditInit(tenantA), 'CP1: Audit Init');
  testCheckpoint(() => governedGate.assertCheckpoint2_EvidenceCollection(tenantA), 'CP2: Evidence Collection');
  testCheckpoint(() => governedGate.assertCheckpoint3_EvidenceReconciliation(tenantA), 'CP3: Evidence Reconciliation');
  testCheckpoint(() => governedGate.assertCheckpoint4_CriteriaEvaluation('CRIT-1.4-01', tenantA), 'CP4: Criteria Evaluation');
  testCheckpoint(() => governedGate.assertCheckpoint5_CertificateConstruction('audit_01', tenantA), 'CP5: Certificate Construction');
  testCheckpoint(() => governedGate.assertCheckpoint6_CertificateSealing('audit_01', tenantA), 'CP6: Certificate Sealing');
  testCheckpoint(() => governedGate.assertCheckpoint7_CertificateExport('audit_01', tenantA), 'CP7: Certificate Export');

  // Verify Runtime fails closed on USER_STOP
  let runtimeAborted = false;
  try {
    const governedRuntime = new Phase14ExitCertificateRuntime({ authority });
    await governedRuntime.runIndependentAudit({ tenantId: tenantA });
  } catch (err: any) {
    if (err instanceof Phase14AuditAbortedError) {
      runtimeAborted = true;
    }
  }
  expect(runtimeAborted, 'Runtime synchronously fails closed when USER_STOP active');

  // Reset USER_STOP
  authority.resetUserStop('master_operator');
  expect(authority.isUserStopActive === false, 'USER_STOP successfully reset by Master Authority');

  // ---------------------------------------------------------------------------
  // SECTION 8: SECURITY, PROTOTYPE POLLUTION & IDENTIFIER DEFENSE
  // ---------------------------------------------------------------------------
  console.log('--- SECTION 8: Security & Identifier Validation Defense ---');

  const testSecurityRejection = (id: string, param: string, expectedErr: any) => {
    let rejected = false;
    try {
      gate.validateIdentifier(id, param);
    } catch (err) {
      if (err instanceof expectedErr) {
        rejected = true;
      }
    }
    expect(rejected, `Gate rejected malicious ${param}: "${id}"`);
  };

  testSecurityRejection('', 'tenantId', Phase14ValidationError);
  testSecurityRejection('   ', 'tenantId', Phase14ValidationError);
  testSecurityRejection('tenant\0null', 'tenantId', Phase14SecurityError);
  testSecurityRejection('tenant/../traversal', 'tenantId', Phase14SecurityError);
  testSecurityRejection('tenant\\..\\traversal', 'tenantId', Phase14SecurityError);
  testSecurityRejection('__proto__', 'tenantId', Phase14SecurityError);
  testSecurityRejection('constructor', 'tenantId', Phase14SecurityError);
  testSecurityRejection('prototype', 'tenantId', Phase14SecurityError);

  // ---------------------------------------------------------------------------
  // SECTION 9: MULTI-TENANT ISOLATION & CONCURRENCY
  // ---------------------------------------------------------------------------
  console.log('--- SECTION 9: Multi-Tenant Isolation & Concurrency ---');

  const [resAlpha, resBeta] = await Promise.all([
    runtime.runIndependentAudit({
      tenantId: tenantA,
      overrideFilesystemCheck: () => false,
    }),
    runtime.runIndependentAudit({
      tenantId: tenantB,
      overrideFilesystemCheck: () => false,
    }),
  ]);

  expect(resAlpha.certificate.tenantId === tenantA, 'Tenant Alpha certificate isolated');
  expect(resBeta.certificate.tenantId === tenantB, 'Tenant Beta certificate isolated');
  expect(resAlpha.certificate.certificateId !== resBeta.certificate.certificateId, 'Unique certificate IDs');
  expect(resAlpha.certificate.auditId !== resBeta.certificate.auditId, 'Unique audit IDs');
  expect(resAlpha.certificate.certificateHash !== resBeta.certificate.certificateHash, 'Different tenant certificate hashes');

  // Determinism test: same tenant + same inputs produce same composite hashes
  const provA = auditEngine.deriveAuthenticProvenanceManifest(tenantA, []);
  const provA2 = auditEngine.deriveAuthenticProvenanceManifest(tenantA, []);
  expect(provA.compositeAuditProvenanceHash === provA2.compositeAuditProvenanceHash, 'Deterministic provenance hash for identical inputs');

  // ---------------------------------------------------------------------------
  // SECTION 10: DEEP IMMUTABILITY VERIFICATION
  // ---------------------------------------------------------------------------
  console.log('--- SECTION 10: Deep Immutability Verification ---');

  const cert = cleanResult.certificate;
  expect(Object.isFrozen(cert), 'Root certificate is frozen');
  expect(Object.isFrozen(cert.criteriaResults), 'criteriaResults array is frozen');
  expect(Object.isFrozen(cert.contradictions), 'contradictions array is frozen');
  expect(Object.isFrozen(cert.provenanceManifest), 'provenanceManifest is frozen');
  expect(Object.isFrozen(cert.rawEvidenceHashes), 'rawEvidenceHashes is frozen');

  for (const crit of cert.criteriaResults) {
    expect(Object.isFrozen(crit), `Criterion ${crit.criterionId} result is frozen`);
    expect(Object.isFrozen(crit.supportingEvidenceIds), `Supporting evidence IDs for ${crit.criterionId} is frozen`);
  }

  // Verify mutation attempts fail
  let mutationBlocked = false;
  try {
    (cert as any).status = 'MUTATED';
  } catch {
    mutationBlocked = true;
  }
  expect(mutationBlocked, 'Direct mutation of certificate throws in strict mode');

  // ---------------------------------------------------------------------------
  // SECTION 11: AUTHORITY BOUNDARY & NON-AUTHORIZATION VERIFICATION
  // ---------------------------------------------------------------------------
  console.log('--- SECTION 11: Authority Boundary & Non-Authorization Verification ---');

  // Verify that MS-1.4.13 contains zero tool execution methods
  expect((runtime as any).executeTool === undefined, 'Runtime has no executeTool method');
  expect((runtime as any).authorizePhaseExit === undefined, 'Runtime has no authorizePhaseExit method');
  expect((runtime as any).approveExit === undefined, 'Runtime has no approveExit method');
  expect((auditEngine as any).executeTool === undefined, 'Audit engine has no executeTool method');
  expect((auditEngine as any).authorizePhaseExit === undefined, 'Audit engine has no authorizePhaseExit method');

  // Verify certificate disclaimer
  expect(
    cert.disclaimer === 'NON_AUTHORITATIVE_AUDIT_ONLY_REQUIRES_MASTER_HUMAN_GOVERNANCE_DECISION',
    'Certificate strictly asserts non-authoritative nature'
  );

  console.log('\n================================================================================');
  console.log(`ALL TESTS PASSED: ${passedAssertions} ASSERTIONS VERIFIED CLEAN`);
  console.log('MS-1.4.13 PHASE 1.4 EXIT BOUNDARY & INDEPENDENT AUDIT SUITE COMPLETE');
  console.log('================================================================================\n');
}

runAllTests().catch((err) => {
  console.error('[FATAL TEST SUITE FAILURE]', err);
  process.exit(1);
});
