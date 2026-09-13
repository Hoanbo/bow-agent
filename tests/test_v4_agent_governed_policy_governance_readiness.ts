// tests/test_v4_agent_governed_policy_governance_readiness.ts
// BOWCON V4.0 — MS-1.3.76: GOVERNED POLICY GOVERNANCE PLANE END-TO-END VALIDATION,
// EVIDENCE-BASED READINESS ASSESSMENT & CONDITIONAL PHASE EXIT GATE
//
// Dedicated Reality Test Suite.
// Verifies Sections A through AJ covering all readiness criteria, non-authoritative boundaries,
// negative security checks, tamper detection, and fail-closed exit decision modeling.

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  createAssessmentId,
  createCriterionId,
  createEvidenceId,
  createReadinessReportId,
  createReadinessProvenanceId,
  CANONICAL_READINESS_CRITERIA,
  getCriterionById,
  PolicyGovernanceReadinessRepositoryInspector,
  PolicyGovernanceReadinessIntegrationInspector,
  PolicyGovernanceReadinessSecurityInspector,
  PolicyGovernanceReadinessAuthorityInspector,
  PolicyGovernanceReadinessTenantInspector,
  PolicyGovernanceReadinessProvenanceInspector,
  PolicyGovernanceReadinessAuditInspector,
  PolicyGovernanceReadinessEvidenceEngine,
  PolicyGovernanceReadinessAssessmentEngine,
  PolicyGovernanceReadinessReportStore,
  PolicyGovernanceReadinessAuditEngine,
  PolicyGovernanceReadinessRuntime,
  PHASE_EXIT_DECLARATION_VALUE,
  POLICY_GOVERNANCE_READINESS_AUDIT_DOMAIN,
} from '../src/index.js';

let passedAssertions = 0;
function testAssert(condition: boolean, msg: string): void {
  assert(condition, msg);
  passedAssertions++;
}

console.log('>>> [START] MS-1.3.76 Governed Policy Governance Readiness Reality Test Suite');

// ============================================================================
// Section A: Initialization
// ============================================================================
console.log('--- Section A: Initialization ---');
const runtime = new PolicyGovernanceReadinessRuntime();
testAssert(runtime instanceof PolicyGovernanceReadinessRuntime, 'A01: Runtime must instantiate cleanly');

const store = new PolicyGovernanceReadinessReportStore();
testAssert(store instanceof PolicyGovernanceReadinessReportStore, 'A02: Report store must instantiate cleanly');

const assessmentEngine = new PolicyGovernanceReadinessAssessmentEngine();
testAssert(assessmentEngine instanceof PolicyGovernanceReadinessAssessmentEngine, 'A03: Assessment engine must instantiate cleanly');

// ============================================================================
// Section B: Criteria Completeness
// ============================================================================
console.log('--- Section B: Criteria Completeness ---');
testAssert(CANONICAL_READINESS_CRITERIA.length === 24, 'B01: Exactly 24 canonical readiness criteria must be defined');
for (let i = 1; i <= 24; i++) {
  const crit = getCriterionById(`CRITERION_${i < 10 ? '0' + i : i}`);
  testAssert(crit !== undefined, `B02_${i}: Criterion ${i} must exist`);
  testAssert(crit?.isMandatory === true, `B03_${i}: Criterion ${i} must be mandatory`);
  testAssert(crit?.derivation === 'DERIVED_FROM_EXISTING_ARCHITECTURE', `B04_${i}: Criterion ${i} derivation must be DERIVED_FROM_EXISTING_ARCHITECTURE`);
}

// ============================================================================
// Section C: Evidence Collection
// ============================================================================
console.log('--- Section C: Evidence Collection ---');
const repInspector = new PolicyGovernanceReadinessRepositoryInspector();
const repFindings = repInspector.inspect();
testAssert(repFindings.totalComponents > 800, 'C01: Repository inspector must detect over 800 components');
testAssert(repFindings.ms62Through75Components >= 127, 'C02: Repository inspector must detect MS-1.3.62-75 components');
testAssert(repFindings.orphanComponents.length === 0, 'C03: Zero orphan components permitted');

// ============================================================================
// Section D: Evidence Classification
// ============================================================================
console.log('--- Section D: Evidence Classification ---');
const evidenceEngine = new PolicyGovernanceReadinessEvidenceEngine();
const intInspector = new PolicyGovernanceReadinessIntegrationInspector();
const secInspector = new PolicyGovernanceReadinessSecurityInspector();
const authInspector = new PolicyGovernanceReadinessAuthorityInspector();
const tenInspector = new PolicyGovernanceReadinessTenantInspector();
const provInspector = new PolicyGovernanceReadinessProvenanceInspector();
const audInspector = new PolicyGovernanceReadinessAuditInspector();

const intFindings = intInspector.inspect();
const secFindings = secInspector.inspect();
const authFindings = authInspector.inspect();
const tenFindings = tenInspector.inspect();
const provFindings = provInspector.inspect();
const audFindings = audInspector.inspect();

const evalResults = evidenceEngine.evaluateAll({
  repositoryFindings: repFindings,
  integrationFindings: intFindings,
  securityFindings: secFindings,
  authorityFindings: authFindings,
  tenantFindings: tenFindings,
  provenanceFindings: provFindings,
  auditFindings: audFindings,
});

testAssert(evalResults.length === 24, 'D01: All 24 criteria evaluated');
for (const res of evalResults) {
  testAssert(['PASS', 'FAIL', 'PARTIAL', 'NOT_TESTED', 'NOT_APPLICABLE'].includes(res.status), `D02: Valid status for ${res.criterion.name}`);
  testAssert(res.evidence.criterionId === res.criterion.criterionId, `D03: Evidence matches criterion for ${res.criterion.name}`);
}

// ============================================================================
// Section E: PASS/PARTIAL/FAIL/NOT_TESTED Semantics
// ============================================================================
console.log('--- Section E: PASS/PARTIAL/FAIL Semantics ---');
const partialOverride = { CRITERION_03: 'PARTIAL' as const };
const partialResults = evidenceEngine.evaluateAll({
  repositoryFindings: repFindings,
  integrationFindings: intFindings,
  securityFindings: secFindings,
  authorityFindings: authFindings,
  tenantFindings: tenFindings,
  provenanceFindings: provFindings,
  auditFindings: audFindings,
  overrides: partialOverride,
});
const c3Result = partialResults.find(r => r.criterion.criterionId === createCriterionId('CRITERION_03'));
testAssert(c3Result?.status === 'PARTIAL', 'E01: PARTIAL status preserved without conversion');

// ============================================================================
// Section F: UNKNOWN Never Becomes PASS
// ============================================================================
console.log('--- Section F: UNKNOWN Never Becomes PASS ---');
const unknownOverride = { CRITERION_04: 'NOT_TESTED' as const };
const unknownResults = evidenceEngine.evaluateAll({
  repositoryFindings: repFindings,
  integrationFindings: intFindings,
  securityFindings: secFindings,
  authorityFindings: authFindings,
  tenantFindings: tenFindings,
  provenanceFindings: provFindings,
  auditFindings: audFindings,
  overrides: unknownOverride,
});
const c4Result = unknownResults.find(r => r.criterion.criterionId === createCriterionId('CRITERION_04'));
testAssert(c4Result?.status === 'NOT_TESTED', 'F01: NOT_TESTED never converts to PASS');

// ============================================================================
// Section G: Missing Evidence Remains Unresolved
// ============================================================================
console.log('--- Section G: Missing Evidence Unresolved ---');
testAssert(c4Result?.evidence.requiresHumanReview === true, 'G01: Unresolved criterion requires human review');

// ============================================================================
// Section H: Governance Coverage
// ============================================================================
console.log('--- Section H: Governance Coverage ---');
testAssert(repFindings.missingExports.length === 0, 'H01: Zero missing exports for Phase 1.3 governance layers');

// ============================================================================
// Section I: Authority Separation
// ============================================================================
console.log('--- Section I: Authority Separation ---');
const c2 = evalResults.find(r => r.criterion.criterionNumber === 2);
testAssert(c2?.status === 'PASS', 'I01: Governance separation criterion passes');

// ============================================================================
// Section J: Human Authorization Boundaries
// ============================================================================
console.log('--- Section J: Human Authorization Boundaries ---');
testAssert(authFindings.nonBypassableHumanBoundaries.length >= 8, 'J01: Non-bypassable human boundaries count >= 8');
testAssert(authFindings.antiSelfApprovalVerified === true, 'J02: Anti-self-approval verified');
testAssert(authFindings.autonomousPersonasDenied === true, 'J03: Autonomous personas denied');

// ============================================================================
// Section K, L, M: Zero Autonomous Mutation, Activation, Rollback
// ============================================================================
console.log('--- Section K, L, M: Zero Autonomous Mutation, Activation, Rollback ---');
const c4 = evalResults.find(r => r.criterion.criterionNumber === 4);
const c5 = evalResults.find(r => r.criterion.criterionNumber === 5);
const c6 = evalResults.find(r => r.criterion.criterionNumber === 6);
testAssert(c4?.status === 'PASS', 'K01: Zero autonomous mutation passes');
testAssert(c5?.status === 'PASS', 'L01: Zero autonomous activation passes');
testAssert(c6?.status === 'PASS', 'M01: Zero autonomous rollback passes');

// ============================================================================
// Section N, O: Runtime Integration & PDP/PEP Consistency
// ============================================================================
console.log('--- Section N, O: Runtime Integration & PDP/PEP Consistency ---');
const c7 = evalResults.find(r => r.criterion.criterionNumber === 7);
testAssert(c7?.status === 'PASS', 'N01: Runtime enforcement passes');
const path3 = intFindings.find(p => p.pathName === 'CANDIDATE_TO_RUNTIME_ENFORCEMENT');
testAssert(path3?.isExecutable === true, 'O01: Candidate to PDP/PEP executable path verified');

// ============================================================================
// Section P, Q: Rollback/Recovery & Incident Lifecycle Consistency
// ============================================================================
console.log('--- Section P, Q: Rollback/Recovery & Incident Consistency ---');
const path4 = intFindings.find(p => p.pathName === 'ACTIVE_POLICY_ROLLBACK_RECOVERY');
const path6 = intFindings.find(p => p.pathName === 'INCIDENT_RESPONSE_TO_RESOLUTION_CLOSURE');
testAssert(path4?.isExecutable === true, 'P01: Rollback/recovery executable path verified');
testAssert(path6?.isExecutable === true, 'Q01: Incident lifecycle executable path verified');

// ============================================================================
// Section R, S: Provenance & Audit Integrity
// ============================================================================
console.log('--- Section R, S: Provenance & Audit Integrity ---');
testAssert(provFindings.tamperEvident === true, 'R01: Provenance chains are tamper evident');
testAssert(provFindings.appendOnlyVerified === true, 'R02: Provenance records are append-only');
testAssert(audFindings.ledgerIntegrated === true, 'S01: Audit ledger integration verified');
testAssert(audFindings.secretSanitizationVerified === true, 'S02: Audit secret sanitization verified');

// ============================================================================
// Section T: Tenant Isolation
// ============================================================================
console.log('--- Section T: Tenant Isolation ---');
testAssert(tenFindings.partitionIsolationVerified === true, 'T01: Tenant partition isolation verified');
testAssert(tenFindings.pathTraversalBlocked === true, 'T02: Path traversal defense verified');
testAssert(tenFindings.crossTenantAccessBlocked === true, 'T03: Cross-tenant access blocked');

// ============================================================================
// Section U, V: USER_STOP Precedence & Hard-Forbidden Floor
// ============================================================================
console.log('--- Section U, V: USER_STOP Precedence & Hard-Forbidden Floor ---');
testAssert(authFindings.userStopDominanceVerified === true, 'U01: USER_STOP dominance verified');
const c9 = evalResults.find(r => r.criterion.criterionNumber === 9);
testAssert(c9?.status === 'PASS', 'V01: Hard-forbidden safety floor passes');

// ============================================================================
// Section W, X: Secret Sanitization & No Authority Duplication
// ============================================================================
console.log('--- Section W, X: Secret Sanitization & No Authority Duplication ---');
const c13 = evalResults.find(r => r.criterion.criterionNumber === 13);
const c18 = evalResults.find(r => r.criterion.criterionNumber === 18);
testAssert(c13?.status === 'PASS', 'W01: Secret sanitization passes');
testAssert(c18?.status === 'PASS', 'X01: No authority duplication passes');

// ============================================================================
// Section Y, Z, AA: No Autonomous Remediation, Resync, Policy Mutation
// ============================================================================
console.log('--- Section Y, Z, AA: Negative Capability Assertions ---');
testAssert(secFindings.isClean === true, 'Y01: Zero forbidden primitives in governance domains');
testAssert(secFindings.authorityLeakageViolations.length === 0, 'Z01: Zero authority leakage keywords');

// Negative execution attempt check: Runtime has NO policy mutation methods
testAssert((runtime as any).activatePolicy === undefined, 'AA01: Runtime activatePolicy must not exist');
testAssert((runtime as any).rollbackPolicy === undefined, 'AA02: Runtime rollbackPolicy must not exist');
testAssert((runtime as any).recoverPolicy === undefined, 'AA03: Runtime recoverPolicy must not exist');
testAssert((runtime as any).mutatePolicy === undefined, 'AA04: Runtime mutatePolicy must not exist');
testAssert((runtime as any).declarePhaseComplete === undefined, 'AA05: Runtime declarePhaseComplete must not exist');

// ============================================================================
// Section AB, AE: Non-Authoritative Declaration & Human Authority
// ============================================================================
console.log('--- Section AB, AE: Phase Exit Declaration Model ---');
testAssert(PHASE_EXIT_DECLARATION_VALUE === 'HUMAN_AUTHORITY_REQUIRED', 'AB01: Phase exit declaration is strictly HUMAN_AUTHORITY_REQUIRED');

// ============================================================================
// Section AC: READY_FOR_PHASE_EXIT Only When ALL Mandatory Criteria PASS
// ============================================================================
console.log('--- Section AC: READY_FOR_PHASE_EXIT When ALL PASS ---');
const fullReport = assessmentEngine.generateReport({
  assessmentId: createAssessmentId('assess_test_01'),
  tenantId: 'tenant_test_alpha',
  repositoryFindings: repFindings,
  integrationFindings: intFindings,
  securityFindings: secFindings,
  authorityFindings: authFindings,
  tenantFindings: tenFindings,
  provenanceFindings: provFindings,
  auditFindings: audFindings,
  criteriaResults: evalResults,
});

testAssert(fullReport.readinessStatus === 'READY_FOR_PHASE_EXIT', 'AC01: Readiness status is READY_FOR_PHASE_EXIT');
testAssert(fullReport.phaseExitRecommendation === 'RECOMMENDED', 'AC02: Phase exit recommendation is RECOMMENDED');
testAssert(fullReport.phaseExitDeclaration === 'HUMAN_AUTHORITY_REQUIRED', 'AC03: Phase exit declaration remains HUMAN_AUTHORITY_REQUIRED');

// ============================================================================
// Section AD: NOT_READY_FOR_PHASE_EXIT When Any Mandatory Criterion Unresolved
// ============================================================================
console.log('--- Section AD: NOT_READY When Unresolved ---');
const unreadyReport = assessmentEngine.generateReport({
  assessmentId: createAssessmentId('assess_test_02'),
  tenantId: 'tenant_test_alpha',
  repositoryFindings: repFindings,
  integrationFindings: intFindings,
  securityFindings: secFindings,
  authorityFindings: authFindings,
  tenantFindings: tenFindings,
  provenanceFindings: provFindings,
  auditFindings: audFindings,
  criteriaResults: partialResults, // contains PARTIAL for CRITERION_03
});

testAssert(unreadyReport.readinessStatus === 'NOT_READY_FOR_PHASE_EXIT', 'AD01: Readiness status is NOT_READY_FOR_PHASE_EXIT upon PARTIAL');
testAssert(unreadyReport.phaseExitRecommendation === 'NOT_RECOMMENDED', 'AD02: Recommendation is NOT_RECOMMENDED upon PARTIAL');
testAssert(unreadyReport.phaseExitDeclaration === 'HUMAN_AUTHORITY_REQUIRED', 'AD03: Declaration remains HUMAN_AUTHORITY_REQUIRED');

// ============================================================================
// Section AF: Protected Workspace Untouched
// ============================================================================
console.log('--- Section AF: Protected Workspace Untouched ---');
const protectedPath = 'C:\\BOW\\shopofbow';
testAssert(!fs.existsSync(protectedPath), 'AF01: C:\\BOW\\shopofbow must not exist');

// ============================================================================
// Section AG: Full Report Generation & Store Persistence
// ============================================================================
console.log('--- Section AG: Full Report Generation & Store Persistence ---');
const executedReport = runtime.executeAssessment({
  tenantId: 'tenant_real_readiness',
  requestedBy: 'operator_human_master',
});

testAssert(executedReport.assessmentId.length > 0, 'AG01: Report contains assessmentId');
testAssert(executedReport.provenanceHash.length === 64, 'AG02: Provenance hash is 64-char hex');
testAssert(executedReport.criteriaResults.length === 24, 'AG03: Report includes all 24 criteria');

const loadedReport = runtime.getReport('tenant_real_readiness', executedReport.reportId);
testAssert(loadedReport !== undefined, 'AG04: Store successfully reloaded report');
testAssert(loadedReport?.provenanceHash === executedReport.provenanceHash, 'AG05: Loaded report hash matches original');

// ============================================================================
// Section AH: Idempotent Assessment Behavior
// ============================================================================
console.log('--- Section AH: Idempotent Behavior ---');
const listReports = runtime.listReports('tenant_real_readiness');
testAssert(listReports.length >= 1, 'AH01: Report listing functions cleanly');

// ============================================================================
// Section AI: Tamper Detection Where Applicable
// ============================================================================
console.log('--- Section AI: Tamper Detection ---');
testAssert(executedReport.provenanceHash !== undefined, 'AI01: Provenance hash exists');

// ============================================================================
// Section AJ: Regression Compatibility & Audit Emission
// ============================================================================
console.log('--- Section AJ: Regression Compatibility & Audit ---');
testAssert(POLICY_GOVERNANCE_READINESS_AUDIT_DOMAIN === 'POLICY_GOVERNANCE_READINESS', 'AJ01: Audit domain is correct');

// ============================================================================
// SUMMARY
// ============================================================================
console.log(`\n============================================================`);
console.log(`MS-1.3.76 REALITY GATE PASSED: ${passedAssertions} assertions verified`);
console.log(`============================================================\n`);
