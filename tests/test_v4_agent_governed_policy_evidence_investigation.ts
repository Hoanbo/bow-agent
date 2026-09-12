// tests/test_v4_agent_governed_policy_evidence_investigation.ts
// BOWCON V4.0 — MS-1.3.63: GOVERNED POLICY EVIDENCE QUERY,
// AUDIT CORRELATION & INTEGRITY VERIFICATION LAYER
//
// Dedicated Reality Gate Test Suite.
// Verifies all 26 categories (A through Z):
// - Branded evidence identifiers
// - Basic query & pagination
// - Tenant isolation & anonymous fail-closed
// - USER_STOP supremacy
// - Lifecycle trace reconstruction
// - Provenance & audit correlation
// - Independent integrity verification
// - Secret sanitization & zero autonomous authority
//
// Bộ kiểm tra thực tế chuyên dụng cho MS-1.3.63.
// Xác minh toàn bộ 26 danh mục (A đến Z).

import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

import {
  createEvidenceQueryId,
  createEvidenceCorrelationId,
  createPolicyLifecycleTraceId,
  createIntegrityVerificationId,
  PolicyEvidenceQueryEngine,
  PolicyLifecycleTraceEngine,
  PolicyAuditCorrelationEngine,
  PolicyEvidenceIntegrityVerifier,
  PolicyEvidenceInvestigationService,
  globalPolicyEvidenceInvestigationService,
} from '../src/core/policyEvidence/index.js';

import {
  createPolicyEvidenceId,
  PolicyEvidenceCollector,
} from '../src/core/policyObservability/index.js';

import {
  createPolicyCandidateId,
  PolicyCanaryProvenanceEngine,
} from '../src/core/policyCanary/index.js';

import { AuditLedger } from '../src/core/auditLedger.js';
import { DiagnosisSanitizer } from '../src/core/diagnosis/diagnosisSanitizer.js';

// ============================================================================
// TEST HARNESS
// ============================================================================
let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
    failures.push(message);
  }
}

function assertThrows(fn: () => void, expectedSubstring: string, message: string): void {
  try {
    fn();
    console.error(`  [FAIL] ${message} — Expected error containing "${expectedSubstring}" but no error thrown`);
    failed++;
    failures.push(message);
  } catch (e: any) {
    const msg: string = e?.message ?? String(e);
    if (msg.includes(expectedSubstring)) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message} — Expected "${expectedSubstring}", got "${msg}"`);
      failed++;
      failures.push(message);
    }
  }
}

console.log('======================================================================');
console.log('REALITY GATE: MS-1.3.63 GOVERNED POLICY EVIDENCE INVESTIGATION');
console.log('======================================================================');
console.log('');

// ============================================================================
// CATEGORY A: Branded Evidence Identifiers
// ============================================================================
console.log('--- CATEGORY A: Branded evidence identifiers ---');
{
  const qid = createEvidenceQueryId('eqry_test_001');
  assert(qid === 'eqry_test_001', '[CATEGORY A] EvidenceQueryId branded validation succeeded');

  const cid = createEvidenceCorrelationId('ecorr_test_001');
  assert(cid === 'ecorr_test_001', '[CATEGORY A] EvidenceCorrelationId branded validation succeeded');

  const tid = createPolicyLifecycleTraceId('trc_test_001');
  assert(tid === 'trc_test_001', '[CATEGORY A] PolicyLifecycleTraceId branded validation succeeded');

  const vid = createIntegrityVerificationId('vfy_test_001');
  assert(vid === 'vfy_test_001', '[CATEGORY A] IntegrityVerificationId branded validation succeeded');

  assertThrows(
    () => createEvidenceQueryId(''),
    'INVALID_EVIDENCE_QUERY_ID',
    '[CATEGORY A] Empty EvidenceQueryId rejected'
  );
  assertThrows(
    () => createEvidenceCorrelationId('   '),
    'INVALID_EVIDENCE_CORRELATION_ID',
    '[CATEGORY A] Whitespace EvidenceCorrelationId rejected'
  );
  assertThrows(
    () => createPolicyLifecycleTraceId(''),
    'INVALID_POLICY_LIFECYCLE_TRACE_ID',
    '[CATEGORY A] Empty PolicyLifecycleTraceId rejected'
  );
  assertThrows(
    () => createIntegrityVerificationId(''),
    'INVALID_INTEGRITY_VERIFICATION_ID',
    '[CATEGORY A] Empty IntegrityVerificationId rejected'
  );
}

// ============================================================================
// CATEGORY B: Basic Evidence Query
// ============================================================================
console.log('--- CATEGORY B: Basic evidence query ---');
{
  const collector = new PolicyEvidenceCollector();
  const queryEngine = new PolicyEvidenceQueryEngine({ evidenceCollector: collector });

  collector.recordEvaluation({
    tenantPartition: 'tenant_investigation_b',
    activePolicyVersion: 'pol_v1',
    candidatePolicyVersion: 'pol_v2_cand',
    currentRing: 'RING_0',
    toolName: 'read_records',
    activeDecisionAllowed: true,
    candidateDecisionAllowed: true,
    isShadowEvaluation: true,
  });

  collector.recordMismatch({
    tenantPartition: 'tenant_investigation_b',
    candidateId: createPolicyCandidateId('cand_b_001'),
    activePolicyVersion: 'pol_v1',
    candidatePolicyVersion: 'pol_v2_cand',
    currentRing: 'RING_0',
    toolName: 'execute_workflow',
    activeAllowed: false,
    candidateAllowed: true,
    divergenceReason: 'New policy relaxes tool rule',
  });

  const result = queryEngine.queryEvidence({
    tenantPartition: 'tenant_investigation_b',
  });

  assert(result.totalMatches === 2, '[CATEGORY B] Query matched 2 records');
  assert(result.returnedCount === 2, '[CATEGORY B] Query returned 2 records');
  assert(result.records[0].tenantPartition === 'tenant_investigation_b', '[CATEGORY B] Records scoped to tenant');

  // Filter by event type
  const evalOnly = queryEngine.queryEvidence({
    tenantPartition: 'tenant_investigation_b',
    eventTypes: ['EVALUATION'],
  });
  assert(evalOnly.returnedCount === 1, '[CATEGORY B] Filter by eventTypes returned 1 record');
  assert(evalOnly.records[0].eventType === 'EVALUATION', '[CATEGORY B] Filtered record is EVALUATION');
}

// ============================================================================
// CATEGORY C: Pagination and Bounded Query Limits
// ============================================================================
console.log('--- CATEGORY C: Pagination and bounded query limits ---');
{
  const collector = new PolicyEvidenceCollector();
  const queryEngine = new PolicyEvidenceQueryEngine({ evidenceCollector: collector, defaultLimit: 5, maxLimit: 20 });

  for (let i = 0; i < 15; i++) {
    collector.recordEvaluation({
      tenantPartition: 'tenant_page_c',
      activePolicyVersion: 'pol_v1',
      toolName: `tool_${i}`,
      activeDecisionAllowed: true,
      isShadowEvaluation: true,
    });
  }

  // Page 1 (offset 0, limit 5)
  const p1 = queryEngine.queryEvidence({
    tenantPartition: 'tenant_page_c',
    offset: 0,
    limit: 5,
  });
  assert(p1.returnedCount === 5, '[CATEGORY C] Page 1 returns 5 records');
  assert(p1.hasMore === true, '[CATEGORY C] Page 1 hasMore is true');
  assert(p1.totalMatches === 15, '[CATEGORY C] Total matches is 15');

  // Page 2 (offset 5, limit 5)
  const p2 = queryEngine.queryEvidence({
    tenantPartition: 'tenant_page_c',
    offset: 5,
    limit: 5,
  });
  assert(p2.returnedCount === 5, '[CATEGORY C] Page 2 returns 5 records');
  assert(p2.records[0].evidenceId !== p1.records[0].evidenceId, '[CATEGORY C] Page 2 records differ from Page 1');

  // Page 3 (offset 10, limit 5)
  const p3 = queryEngine.queryEvidence({
    tenantPartition: 'tenant_page_c',
    offset: 10,
    limit: 5,
  });
  assert(p3.returnedCount === 5, '[CATEGORY C] Page 3 returns 5 records');
  assert(p3.hasMore === false, '[CATEGORY C] Page 3 hasMore is false (reached end)');

  // Reject negative offset
  assertThrows(
    () => queryEngine.queryEvidence({ tenantPartition: 'tenant_page_c', offset: -1 }),
    'INVALID_QUERY_PAGINATION',
    '[CATEGORY C] Negative offset rejected'
  );

  // Reject limit > maxLimit
  assertThrows(
    () => queryEngine.queryEvidence({ tenantPartition: 'tenant_page_c', limit: 25 }),
    'QUERY_LIMIT_EXCEEDED',
    '[CATEGORY C] Limit exceeding maxLimit rejected'
  );
}

// ============================================================================
// CATEGORY D: Tenant Isolation
// ============================================================================
console.log('--- CATEGORY D: Tenant isolation ---');
{
  const collector = new PolicyEvidenceCollector();
  const queryEngine = new PolicyEvidenceQueryEngine({ evidenceCollector: collector });

  collector.recordEvaluation({
    tenantPartition: 'tenant_alpha',
    activePolicyVersion: 'v1',
    toolName: 'tool_a',
    activeDecisionAllowed: true,
    isShadowEvaluation: true,
  });

  collector.recordEvaluation({
    tenantPartition: 'tenant_beta',
    activePolicyVersion: 'v1',
    toolName: 'tool_b',
    activeDecisionAllowed: true,
    isShadowEvaluation: true,
  });

  const alphaRes = queryEngine.queryEvidence({ tenantPartition: 'tenant_alpha' });
  assert(alphaRes.returnedCount === 1, '[CATEGORY D] Tenant Alpha query returns 1 record');
  assert(alphaRes.records[0].tenantPartition === 'tenant_alpha', '[CATEGORY D] Alpha record isolated');

  const betaRes = queryEngine.queryEvidence({ tenantPartition: 'tenant_beta' });
  assert(betaRes.returnedCount === 1, '[CATEGORY D] Tenant Beta query returns 1 record');
  assert(betaRes.records[0].tenantPartition === 'tenant_beta', '[CATEGORY D] Beta record isolated');

  // Traversal attack rejected
  assertThrows(
    () => queryEngine.queryEvidence({ tenantPartition: '../tenant_alpha' }),
    'Path traversal or illegal separator detected',
    '[CATEGORY D] Path traversal in tenantPartition rejected'
  );
}

// ============================================================================
// CATEGORY E: Anonymous Fail-Closed Behavior
// ============================================================================
console.log('--- CATEGORY E: Anonymous fail-closed behavior ---');
{
  const queryEngine = new PolicyEvidenceQueryEngine();

  assertThrows(
    () => queryEngine.queryEvidence({ tenantPartition: 'anonymous' }),
    'Anonymous or unresolved user cannot access',
    '[CATEGORY E] "anonymous" tenantPartition fails closed'
  );

  assertThrows(
    () => queryEngine.queryEvidence({ tenantPartition: 'anon' }),
    'Anonymous or unresolved user cannot access',
    '[CATEGORY E] "anon" tenantPartition fails closed'
  );

  assertThrows(
    () => queryEngine.queryEvidence({ tenantPartition: '' }),
    'must be a non-empty string',
    '[CATEGORY E] Empty tenantPartition fails closed'
  );
}

// ============================================================================
// CATEGORY F: USER_STOP Supremacy
// ============================================================================
console.log('--- CATEGORY F: USER_STOP supremacy ---');
{
  let stopActive = false;
  const service = new PolicyEvidenceInvestigationService({
    isUserStopActive: () => stopActive,
  });

  // Allowed when USER_STOP inactive
  const resBefore = service.queryEvidence({ tenantPartition: 'tenant_stop_f' });
  assert(resBefore.returnedCount === 0, '[CATEGORY F] Query succeeds when USER_STOP is inactive');

  // Activate USER_STOP
  stopActive = true;

  assertThrows(
    () => service.queryEvidence({ tenantPartition: 'tenant_stop_f' }),
    'OPERATION_SUSPENDED_BY_USER_STOP',
    '[CATEGORY F] queryEvidence blocked by USER_STOP'
  );

  assertThrows(
    () => service.getPolicyLifecycleTrace('tenant_stop_f', createPolicyCandidateId('cand_f_001')),
    'OPERATION_SUSPENDED_BY_USER_STOP',
    '[CATEGORY F] getPolicyLifecycleTrace blocked by USER_STOP'
  );

  assertThrows(
    () => service.correlateAudit('tenant_stop_f'),
    'OPERATION_SUSPENDED_BY_USER_STOP',
    '[CATEGORY F] correlateAudit blocked by USER_STOP'
  );

  assertThrows(
    () => service.verifyIntegrity('tenant_stop_f', createPolicyCandidateId('cand_f_001')),
    'OPERATION_SUSPENDED_BY_USER_STOP',
    '[CATEGORY F] verifyIntegrity blocked by USER_STOP'
  );

  assertThrows(
    () => service.getInvestigationSummary('tenant_stop_f', createPolicyCandidateId('cand_f_001')),
    'OPERATION_SUSPENDED_BY_USER_STOP',
    '[CATEGORY F] getInvestigationSummary blocked by USER_STOP'
  );
}

// ============================================================================
// CATEGORY G: Lifecycle Trace Reconstruction
// ============================================================================
console.log('--- CATEGORY G: Lifecycle trace reconstruction ---');
{
  const collector = new PolicyEvidenceCollector();
  const provenance = new PolicyCanaryProvenanceEngine();
  const traceEngine = new PolicyLifecycleTraceEngine({
    evidenceCollector: collector,
    provenanceEngine: provenance,
  });

  const candId = createPolicyCandidateId('cand_trace_g01');
  const tenant = 'tenant_trace_g';

  // Record provenance chain from Proposal -> Ring 0 -> Ring 1 -> Ring 4
  provenance.recordEvent({
    candidateId: candId,
    tenantPartition: tenant,
    ring: 'RING_0',
    eventType: 'PROPOSAL',
    candidatePolicyVersion: 'v2.0.0',
    evidenceReference: 'prop_999',
  });

  provenance.recordEvent({
    candidateId: candId,
    tenantPartition: tenant,
    ring: 'RING_0',
    eventType: 'SHADOW_ENTRY',
    candidatePolicyVersion: 'v2.0.0',
  });

  provenance.recordEvent({
    candidateId: candId,
    tenantPartition: tenant,
    ring: 'RING_1',
    eventType: 'AUTHORIZATION',
    candidatePolicyVersion: 'v2.0.0',
    authorizationReference: 'auth_token_hash_xyz',
  });

  provenance.recordEvent({
    candidateId: candId,
    tenantPartition: tenant,
    ring: 'RING_4',
    eventType: 'PROMOTION',
    candidatePolicyVersion: 'v2.0.0',
  });

  collector.recordEvaluation({
    tenantPartition: tenant,
    activePolicyVersion: 'v1.0.0',
    candidatePolicyVersion: 'v2.0.0',
    currentRing: 'RING_0',
    toolName: 'search_records',
    activeDecisionAllowed: true,
    candidateDecisionAllowed: true,
    isShadowEvaluation: true,
  });

  const trace = traceEngine.reconstructTrace(tenant, candId);
  assert(trace.candidateId === candId, '[CATEGORY G] Candidate ID matches');
  assert(trace.candidatePolicyVersion === 'v2.0.0', '[CATEGORY G] Candidate policy version detected');
  assert(trace.proposalId === 'prop_999', '[CATEGORY G] Proposal ID recovered');
  assert(trace.isGloballyActive === true, '[CATEGORY G] Candidate is globally active (reached Ring 4 without rollback)');
  assert(trace.currentState === 'GLOBAL', '[CATEGORY G] Current state is GLOBAL');
  assert(trace.wasRolledBack === false, '[CATEGORY G] wasRolledBack is false');
}

// ============================================================================
// CATEGORY H: Ring Transition Ordering
// ============================================================================
console.log('--- CATEGORY H: Ring transition ordering ---');
{
  const collector = new PolicyEvidenceCollector();
  const provenance = new PolicyCanaryProvenanceEngine();
  const traceEngine = new PolicyLifecycleTraceEngine({ evidenceCollector: collector, provenanceEngine: provenance });

  const candId = createPolicyCandidateId('cand_ring_h01');
  const tenant = 'tenant_ring_h';

  provenance.recordEvent({
    candidateId: candId,
    tenantPartition: tenant,
    ring: 'RING_0',
    eventType: 'EVALUATION',
    candidatePolicyVersion: 'v1.1',
  });

  provenance.recordEvent({
    candidateId: candId,
    tenantPartition: tenant,
    ring: 'RING_1',
    eventType: 'PROMOTION',
    candidatePolicyVersion: 'v1.1',
  });

  provenance.recordEvent({
    candidateId: candId,
    tenantPartition: tenant,
    ring: 'RING_2',
    eventType: 'PROMOTION',
    candidatePolicyVersion: 'v1.1',
  });

  const trace = traceEngine.reconstructTrace(tenant, candId);
  assert(trace.milestones.length === 5, '[CATEGORY H] Reconstructed exactly 5 canonical ring milestones');
  assert(trace.milestones[0].ring === 'RING_0' && trace.milestones[0].reached === true, '[CATEGORY H] Ring 0 reached');
  assert(trace.milestones[1].ring === 'RING_1' && trace.milestones[1].reached === true, '[CATEGORY H] Ring 1 reached');
  assert(trace.milestones[2].ring === 'RING_2' && trace.milestones[2].reached === true, '[CATEGORY H] Ring 2 reached');
  assert(trace.milestones[3].ring === 'RING_3' && trace.milestones[3].reached === false, '[CATEGORY H] Ring 3 unreached');
  assert(trace.milestones[4].ring === 'RING_4' && trace.milestones[4].reached === false, '[CATEGORY H] Ring 4 unreached');
}

// ============================================================================
// CATEGORY I: Missing Evidence Detection
// ============================================================================
console.log('--- CATEGORY I: Missing evidence detection ---');
{
  const traceEngine = new PolicyLifecycleTraceEngine();
  const candId = createPolicyCandidateId('cand_missing_i01');
  const tenant = 'tenant_missing_i';

  const trace = traceEngine.reconstructTrace(tenant, candId);
  assert(trace.missingRings.length === 5, '[CATEGORY I] All 5 rings detected as missing');
  assert(trace.missingRings.includes('RING_0'), '[CATEGORY I] Ring 0 in missingRings');
  assert(trace.missingRings.includes('RING_4'), '[CATEGORY I] Ring 4 in missingRings');
  assert(trace.milestones.every(m => m.status === 'MISSING'), '[CATEGORY I] All milestones marked MISSING');
  assert(trace.isGloballyActive === false, '[CATEGORY I] Not globally active');
}

// ============================================================================
// CATEGORY J: Incomplete Evidence Detection
// ============================================================================
console.log('--- CATEGORY J: Incomplete evidence detection ---');
{
  const collector = new PolicyEvidenceCollector();
  const provenance = new PolicyCanaryProvenanceEngine();
  const verifier = new PolicyEvidenceIntegrityVerifier({
    evidenceCollector: collector,
    provenanceEngine: provenance,
  });

  const candId = createPolicyCandidateId('cand_incomplete_j01');
  const tenant = 'tenant_incomplete_j';

  // Add evidence to collector, but DO NOT add to provenance engine
  collector.recordEvaluation({
    tenantPartition: tenant,
    activePolicyVersion: 'v1',
    candidatePolicyVersion: 'v2',
    currentRing: 'RING_0',
    toolName: 'tool_j',
    activeDecisionAllowed: true,
    isShadowEvaluation: true,
  });

  // Re-associate by putting a candidateId record
  collector.recordMismatch({
    tenantPartition: tenant,
    candidateId: candId,
    activePolicyVersion: 'v1',
    candidatePolicyVersion: 'v2',
    currentRing: 'RING_0',
    toolName: 'tool_j',
    activeAllowed: false,
    candidateAllowed: true,
  });

  const result = verifier.verifyIntegrity(tenant, candId);
  assert(result.status === 'DEGRADED', '[CATEGORY J] Incomplete evidence reports DEGRADED status');
  assert(result.failureReasons.some(r => r.includes('EVIDENCE_DEGRADED')), '[CATEGORY J] Failure reason indicates unrecorded provenance');
}

// ============================================================================
// CATEGORY K: Corrupted Evidence Detection
// ============================================================================
console.log('--- CATEGORY K: Corrupted evidence detection ---');
{
  const provenance = new PolicyCanaryProvenanceEngine();
  const verifier = new PolicyEvidenceIntegrityVerifier({ provenanceEngine: provenance });

  const candId = createPolicyCandidateId('cand_corrupt_k01');
  const tenant = 'tenant_corrupt_k';

  provenance.recordEvent({
    candidateId: candId,
    tenantPartition: tenant,
    ring: 'RING_0',
    eventType: 'PROPOSAL',
    candidatePolicyVersion: 'v1',
  });

  // Tamper with the internal provenance record to break hash chain
  const chain = provenance.getChain(candId) as any[];
  chain[0].candidatePolicyVersion = 'v1_TAMPERED';

  const result = verifier.verifyIntegrity(tenant, candId);
  assert(result.status === 'INVALID', '[CATEGORY K] Tampered record detected: status is INVALID');
  assert(result.provenanceValid === false, '[CATEGORY K] provenanceValid is false');
  assert(result.failureReasons.some(r => r.includes('PROVENANCE_CHAIN_FAILURE')), '[CATEGORY K] PROVENANCE_CHAIN_FAILURE reported');
}

// ============================================================================
// CATEGORY L: Provenance Verification
// ============================================================================
console.log('--- CATEGORY L: Provenance verification ---');
{
  const provenance = new PolicyCanaryProvenanceEngine();
  const verifier = new PolicyEvidenceIntegrityVerifier({ provenanceEngine: provenance });

  const candId = createPolicyCandidateId('cand_prov_l01');
  const tenant = 'tenant_prov_l';

  provenance.recordEvent({
    candidateId: candId,
    tenantPartition: tenant,
    ring: 'RING_0',
    eventType: 'PROPOSAL',
    candidatePolicyVersion: 'v1',
  });

  provenance.recordEvent({
    candidateId: candId,
    tenantPartition: tenant,
    ring: 'RING_1',
    eventType: 'AUTHORIZATION',
    candidatePolicyVersion: 'v1',
  });

  const result = verifier.verifyIntegrity(tenant, candId);
  assert(result.status === 'VALID', '[CATEGORY L] Intact provenance chain is VALID');
  assert(result.provenanceValid === true, '[CATEGORY L] provenanceValid is true');
  assert(result.provenanceRecordCount === 2, '[CATEGORY L] Record count is 2');
  assert(result.provenanceHeadHash.length === 64, '[CATEGORY L] Head hash is 64-char hex SHA-256');
}

// ============================================================================
// CATEGORY M: Audit Correlation
// ============================================================================
console.log('--- CATEGORY M: Audit correlation ---');
{
  const collector = new PolicyEvidenceCollector();
  const auditLedger = new AuditLedger();
  const correlator = new PolicyAuditCorrelationEngine({
    evidenceCollector: collector,
    auditLedger,
  });

  const tenant = 'tenant_audit_m';
  const correlationKey = 'corr_key_12345';

  collector.recordEvaluation({
    tenantPartition: tenant,
    activePolicyVersion: 'v1',
    candidatePolicyVersion: 'v2',
    currentRing: 'RING_0',
    toolName: 'execute_workflow',
    activeDecisionAllowed: true,
    isShadowEvaluation: true,
    correlationId: correlationKey,
  });

  auditLedger.record({
    timestamp: new Date().toISOString(),
    actor: { userId: 'operator_1', role: 'admin', channel: 'cli' },
    domain: 'POLICY_ENFORCEMENT',
    toolName: 'execute_workflow',
    classification: 'HIGH_IMPACT',
    argumentsHash: 'hash_args_1',
    idempotencyKey: correlationKey,
    policyDecision: 'PERMIT',
    executionStatus: 'SUCCESS',
  });

  const correlation = correlator.correlateEvidenceWithAudit(tenant);
  assert(correlation.matchedCount === 1, '[CATEGORY M] Correlated exactly 1 matching record');
  assert(correlation.correlatedRecords[0].correlationKey === `correlationId:${correlationKey}`, '[CATEGORY M] Correlation key matched');
  assert(correlation.correlatedRecords[0].auditDomain === 'POLICY_ENFORCEMENT', '[CATEGORY M] Audit domain recorded');
  assert(correlation.correlatedRecords[0].auditPolicyDecision === 'PERMIT', '[CATEGORY M] Policy decision recorded');
}

// ============================================================================
// CATEGORY N: Cross-Reference Integrity
// ============================================================================
console.log('--- CATEGORY N: Cross-reference integrity ---');
{
  const auditLedger = new AuditLedger();
  const verifier = new PolicyEvidenceIntegrityVerifier({ auditLedger });

  const result = verifier.verifyIntegrity('tenant_cross_n', createPolicyCandidateId('cand_cross_n01'));
  assert(result.auditReferencesValid === true, '[CATEGORY N] Audit references integrity valid on clean ledger');
}

// ============================================================================
// CATEGORY O: Policy Version Consistency
// ============================================================================
console.log('--- CATEGORY O: Policy version consistency ---');
{
  const provenance = new PolicyCanaryProvenanceEngine();
  const verifier = new PolicyEvidenceIntegrityVerifier({ provenanceEngine: provenance });

  const candId = createPolicyCandidateId('cand_ver_o01');
  const tenant = 'tenant_ver_o';

  provenance.recordEvent({
    candidateId: candId,
    tenantPartition: tenant,
    ring: 'RING_0',
    eventType: 'PROPOSAL',
    candidatePolicyVersion: 'v1.0.0',
  });

  provenance.recordEvent({
    candidateId: candId,
    tenantPartition: tenant,
    ring: 'RING_1',
    eventType: 'PROMOTION',
    candidatePolicyVersion: 'v2.5.0_CONFLICT', // Conflict!
  });

  const result = verifier.verifyIntegrity(tenant, candId);
  assert(result.policyVersionConsistent === false, '[CATEGORY O] Policy version conflict detected');
  assert(result.status === 'INVALID', '[CATEGORY O] Status is INVALID on version mismatch');
  assert(result.failureReasons.some(r => r.includes('POLICY_VERSION_FAILURE')), '[CATEGORY O] POLICY_VERSION_FAILURE reported');
}

// ============================================================================
// CATEGORY P: Chronological Consistency
// ============================================================================
console.log('--- CATEGORY P: Chronological consistency ---');
{
  const provenance = new PolicyCanaryProvenanceEngine();
  const verifier = new PolicyEvidenceIntegrityVerifier({ provenanceEngine: provenance });

  const candId = createPolicyCandidateId('cand_chrono_p01');
  const tenant = 'tenant_chrono_p';

  provenance.recordEvent({
    candidateId: candId,
    tenantPartition: tenant,
    ring: 'RING_0',
    eventType: 'PROPOSAL',
    candidatePolicyVersion: 'v1.0',
  });

  provenance.recordEvent({
    candidateId: candId,
    tenantPartition: tenant,
    ring: 'RING_1',
    eventType: 'PROMOTION',
    candidatePolicyVersion: 'v1.0',
  });

  // Mutate second timestamp to be earlier than first
  const chain = provenance.getChain(candId) as any[];
  chain[1].timestamp = '1970-01-01T00:00:00.000Z';

  const result = verifier.verifyIntegrity(tenant, candId);
  assert(result.chronologicalOrderValid === false, '[CATEGORY P] Backward timestamp detected');
  assert(result.status === 'INVALID', '[CATEGORY P] Status is INVALID on chronological failure');
}

// ============================================================================
// CATEGORY Q: Credential / Token Sanitization
// ============================================================================
console.log('--- CATEGORY Q: Credential/token sanitization ---');
{
  const collector = new PolicyEvidenceCollector();
  const auditLedger = new AuditLedger();
  const correlator = new PolicyAuditCorrelationEngine({
    evidenceCollector: collector,
    auditLedger,
  });

  const tenant = 'tenant_sanit_q';
  const correlationKey = 'corr_sanit_q';

  collector.recordEvaluation({
    tenantPartition: tenant,
    activePolicyVersion: 'v1',
    toolName: 'tool_q',
    activeDecisionAllowed: true,
    isShadowEvaluation: true,
    correlationId: correlationKey,
  });

  // Audit event with a bearer token in toolName or sensitive fields
  auditLedger.record({
    timestamp: new Date().toISOString(),
    actor: { userId: 'op_1', role: 'admin', channel: 'cli' },
    domain: 'POLICY_ENFORCEMENT',
    toolName: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sensitive_payload',
    classification: 'CRITICAL',
    argumentsHash: 'hash_q',
    idempotencyKey: correlationKey,
    policyDecision: 'PERMIT',
    executionStatus: 'SUCCESS',
  });

  const result = correlator.correlateEvidenceWithAudit(tenant);
  assert(result.matchedCount === 1, '[CATEGORY Q] Matched record');
  assert(result.correlatedRecords[0].auditToolName === 'Bearer [REDACTED]', '[CATEGORY Q] Bearer token sanitized to [REDACTED]');
  assert(!result.correlatedRecords[0].auditToolName.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'), '[CATEGORY Q] Raw secret absent from correlation');
}

// ============================================================================
// CATEGORY R: Deterministic Query Results
// ============================================================================
console.log('--- CATEGORY R: Deterministic query results ---');
{
  const collector = new PolicyEvidenceCollector();
  const queryEngine = new PolicyEvidenceQueryEngine({ evidenceCollector: collector });

  const tenant = 'tenant_determ_r';
  for (let i = 0; i < 5; i++) {
    collector.recordEvaluation({
      tenantPartition: tenant,
      activePolicyVersion: 'v1',
      toolName: `tool_${i}`,
      activeDecisionAllowed: true,
      isShadowEvaluation: true,
    });
  }

  const res1 = queryEngine.queryEvidence({ tenantPartition: tenant, offset: 0, limit: 3 });
  const res2 = queryEngine.queryEvidence({ tenantPartition: tenant, offset: 0, limit: 3 });

  assert(res1.returnedCount === res2.returnedCount, '[CATEGORY R] Returned counts match');
  assert(res1.records[0].evidenceId === res2.records[0].evidenceId, '[CATEGORY R] Record 0 deterministic');
  assert(res1.records[1].evidenceId === res2.records[1].evidenceId, '[CATEGORY R] Record 1 deterministic');
  assert(res1.records[2].evidenceId === res2.records[2].evidenceId, '[CATEGORY R] Record 2 deterministic');
}

// ============================================================================
// CATEGORY S: No Mutation Verification
// ============================================================================
console.log('--- CATEGORY S: No mutation verification ---');
{
  const collector = new PolicyEvidenceCollector();
  const provenance = new PolicyCanaryProvenanceEngine();
  const service = new PolicyEvidenceInvestigationService({
    queryEngine: new PolicyEvidenceQueryEngine({ evidenceCollector: collector }),
    traceEngine: new PolicyLifecycleTraceEngine({ evidenceCollector: collector, provenanceEngine: provenance }),
    integrityVerifier: new PolicyEvidenceIntegrityVerifier({ evidenceCollector: collector, provenanceEngine: provenance }),
  });

  const candId = createPolicyCandidateId('cand_nomut_s01');
  const tenant = 'tenant_nomut_s';

  collector.recordEvaluation({
    tenantPartition: tenant,
    activePolicyVersion: 'v1',
    candidatePolicyVersion: 'v2',
    currentRing: 'RING_0',
    toolName: 'tool_s',
    activeDecisionAllowed: true,
    isShadowEvaluation: true,
  });

  provenance.recordEvent({
    candidateId: candId,
    tenantPartition: tenant,
    ring: 'RING_0',
    eventType: 'PROPOSAL',
    candidatePolicyVersion: 'v2',
  });

  const countBefore = collector.getAll(tenant).length;
  const provBefore = provenance.getChain(candId).length;

  // Run full investigation summary
  service.getInvestigationSummary(tenant, candId);

  const countAfter = collector.getAll(tenant).length;
  const provAfter = provenance.getChain(candId).length;

  assert(countBefore === countAfter, '[CATEGORY S] Evidence count unchanged (zero mutation)');
  assert(provBefore === provAfter, '[CATEGORY S] Provenance count unchanged (zero mutation)');
}

// ============================================================================
// CATEGORY T: No Autonomous Authority Leakage
// ============================================================================
console.log('--- CATEGORY T: No autonomous authority leakage ---');
{
  const forbiddenMethods = ['promote', 'approve', 'issueToken', 'rollback', 'resetCircuitBreaker', 'executeTool'];
  const targets = [
    { name: 'PolicyEvidenceQueryEngine', instance: new PolicyEvidenceQueryEngine() },
    { name: 'PolicyLifecycleTraceEngine', instance: new PolicyLifecycleTraceEngine() },
    { name: 'PolicyAuditCorrelationEngine', instance: new PolicyAuditCorrelationEngine() },
    { name: 'PolicyEvidenceIntegrityVerifier', instance: new PolicyEvidenceIntegrityVerifier() },
    { name: 'PolicyEvidenceInvestigationService', instance: new PolicyEvidenceInvestigationService() },
  ];

  for (const t of targets) {
    for (const m of forbiddenMethods) {
      assert(
        (t.instance as any)[m] === undefined,
        `[CATEGORY T] ${t.name} has no ${m}() method`
      );
    }
  }
}

// ============================================================================
// CATEGORY U: Hard-Forbidden Action Immutability
// ============================================================================
console.log('--- CATEGORY U: Hard-forbidden action immutability ---');
{
  const collector = new PolicyEvidenceCollector();
  const traceEngine = new PolicyLifecycleTraceEngine({ evidenceCollector: collector });

  const candId = createPolicyCandidateId('cand_hard_u01');
  const tenant = 'tenant_hard_u';

  collector.recordHardForbiddenAttempt({
    tenantPartition: tenant,
    candidateId: candId,
    actionName: 'transfer_funds',
    circuitBreakerTripped: true,
  });

  const trace = traceEngine.reconstructTrace(tenant, candId);
  assert(trace.wasCircuitBreakerTripped === true, '[CATEGORY U] Hard-forbidden attempt tripped circuit breaker');
  assert(trace.isGloballyActive === false, '[CATEGORY U] Hard-forbidden candidate cannot become globally active');
  assert(trace.currentState === 'FAILED_CLOSED', '[CATEGORY U] State is FAILED_CLOSED');
}

// ============================================================================
// CATEGORY V: Restart/Persistence Investigation Consistency
// ============================================================================
console.log('--- CATEGORY V: Restart/persistence investigation consistency ---');
{
  const tempDir = path.resolve(process.cwd(), 'scratch', 'audit_test_v');
  fs.mkdirSync(tempDir, { recursive: true });
  const auditFile = path.resolve(tempDir, 'test_audit.jsonl');

  if (fs.existsSync(auditFile)) fs.unlinkSync(auditFile);

  // 1. First instance writes to disk
  const ledger1 = new AuditLedger(auditFile);
  ledger1.record({
    timestamp: new Date().toISOString(),
    actor: { userId: 'op_v', role: 'admin', channel: 'cli' },
    domain: 'POLICY_ENFORCEMENT',
    toolName: 'eval_v',
    classification: 'STANDARD',
    argumentsHash: 'hash_v1',
    idempotencyKey: 'corr_v1',
    policyDecision: 'PERMIT',
    executionStatus: 'SUCCESS',
  });

  // 2. Second instance reloads from disk
  const ledger2 = new AuditLedger(auditFile);
  const verifier = new PolicyEvidenceIntegrityVerifier({ auditLedger: ledger2 });

  const result = verifier.verifyIntegrity('tenant_v', createPolicyCandidateId('cand_v01'));
  assert(result.auditReferencesValid === true, '[CATEGORY V] Reloaded audit ledger chain integrity intact');

  // Clean up
  if (fs.existsSync(auditFile)) fs.unlinkSync(auditFile);
  fs.rmSync(tempDir, { recursive: true, force: true });
}

// ============================================================================
// CATEGORY W: Tampered Audit Record Detection
// ============================================================================
console.log('--- CATEGORY W: Tampered audit record detection ---');
{
  const auditLedger = new AuditLedger();
  auditLedger.record({
    timestamp: new Date().toISOString(),
    actor: { userId: 'op_w', role: 'admin', channel: 'cli' },
    domain: 'POLICY_ENFORCEMENT',
    toolName: 'tool_w',
    classification: 'STANDARD',
    argumentsHash: 'hash_w',
    policyDecision: 'PERMIT',
    executionStatus: 'SUCCESS',
  });

  // Tamper with in-memory audit log
  const trail = (auditLedger as any).auditLog as any[];
  trail[0].policyDecision = 'DENY'; // Tamper decision without updating signature

  const verifier = new PolicyEvidenceIntegrityVerifier({ auditLedger });
  const result = verifier.verifyIntegrity('tenant_w', createPolicyCandidateId('cand_w01'));

  assert(result.auditReferencesValid === false, '[CATEGORY W] Tampered audit record detected');
  assert(result.status === 'INVALID', '[CATEGORY W] Status is INVALID on audit tampering');
  assert(result.failureReasons.some(r => r.includes('AUDIT_INTEGRITY_FAILURE')), '[CATEGORY W] AUDIT_INTEGRITY_FAILURE reported');
}

// ============================================================================
// CATEGORY X: Broken Provenance Reference Detection
// ============================================================================
console.log('--- CATEGORY X: Broken provenance reference detection ---');
{
  const provenance = new PolicyCanaryProvenanceEngine();
  const verifier = new PolicyEvidenceIntegrityVerifier({ provenanceEngine: provenance });

  const candId = createPolicyCandidateId('cand_broken_x01');
  const tenant = 'tenant_broken_x';

  provenance.recordEvent({
    candidateId: candId,
    tenantPartition: tenant,
    ring: 'RING_0',
    eventType: 'PROPOSAL',
    candidatePolicyVersion: 'v1',
  });

  provenance.recordEvent({
    candidateId: candId,
    tenantPartition: tenant,
    ring: 'RING_1',
    eventType: 'PROMOTION',
    candidatePolicyVersion: 'v1',
  });

  // Break previousHash of record 1
  const chain = provenance.getChain(candId) as any[];
  chain[1].previousHash = '0000000000000000000000000000000000000000000000000000000000000000';

  const result = verifier.verifyIntegrity(tenant, candId);
  assert(result.provenanceValid === false, '[CATEGORY X] Broken previousHash detected');
  assert(result.status === 'INVALID', '[CATEGORY X] Status is INVALID on broken previousHash');
  assert(result.failureReasons.some(r => r.includes('PROVENANCE_HASH_BREAK')), '[CATEGORY X] PROVENANCE_HASH_BREAK reported');
}

// ============================================================================
// CATEGORY Y: Large Bounded Query Behavior
// ============================================================================
console.log('--- CATEGORY Y: Large bounded query behavior ---');
{
  const collector = new PolicyEvidenceCollector();
  const queryEngine = new PolicyEvidenceQueryEngine({ evidenceCollector: collector });

  const tenant = 'tenant_large_y';
  for (let i = 0; i < 150; i++) {
    collector.recordEvaluation({
      tenantPartition: tenant,
      activePolicyVersion: 'v1',
      toolName: `tool_y_${i}`,
      activeDecisionAllowed: true,
      isShadowEvaluation: true,
    });
  }

  // Requesting default limit (50)
  const defaultRes = queryEngine.queryEvidence({ tenantPartition: tenant });
  assert(defaultRes.returnedCount === 50, '[CATEGORY Y] Default limit returns 50 records');
  assert(defaultRes.totalMatches === 150, '[CATEGORY Y] Total matches is 150');
  assert(defaultRes.hasMore === true, '[CATEGORY Y] hasMore is true');

  // Requesting maximum limit (100)
  const maxRes = queryEngine.queryEvidence({ tenantPartition: tenant, limit: 100 });
  assert(maxRes.returnedCount === 100, '[CATEGORY Y] Max limit returns 100 records');
  assert(maxRes.hasMore === true, '[CATEGORY Y] hasMore is true');

  // Requesting next page (offset 100, limit 100)
  const page2 = queryEngine.queryEvidence({ tenantPartition: tenant, offset: 100, limit: 100 });
  assert(page2.returnedCount === 50, '[CATEGORY Y] Second page returns remaining 50 records');
  assert(page2.hasMore === false, '[CATEGORY Y] Second page hasMore is false');
}

// ============================================================================
// CATEGORY Z: Forbidden Primitive Scan
// ============================================================================
console.log('--- CATEGORY Z: Forbidden primitive scan ---');
{
  const forbiddenPatterns = [
    /\bchild_process\b/,
    /\bexecSync\b/,
    /\bexec\s*\(/,
    /\bspawn\s*\(/,
    /\bfork\s*\(/,
    /\beval\s*\(/,
    /\bFunction\s*\(/,
  ];

  const domainDir = path.resolve(process.cwd(), 'src', 'core', 'policyEvidence');
  const files = fs.readdirSync(domainDir).filter(f => f.endsWith('.ts'));

  let violations = 0;
  for (const file of files) {
    const content = fs.readFileSync(path.resolve(domainDir, file), 'utf8');
    for (const pat of forbiddenPatterns) {
      if (pat.test(content)) {
        console.error(`  [FAIL] Forbidden pattern ${pat} found in ${file}`);
        violations++;
      }
    }
  }

  assert(violations === 0, '[CATEGORY Z] Static scan clean: 0 forbidden execution primitives in policyEvidence domain');
}

// ============================================================================
// PROTECTED WORKSPACE GATE
// ============================================================================
console.log('--- PROTECTED WORKSPACE GATE ---');
{
  const protectedPath = 'C:\\BOW\\shopofbow';
  const exists = fs.existsSync(protectedPath);
  assert(exists === false, '[GATE 8] Protected workspace C:\\BOW\\shopofbow untouched and does not exist');
}

// ============================================================================
// FINAL REPORT & STATS
// ============================================================================
console.log('');
console.log('======================================================================');
console.log(`REALITY GATE COMPLETE: All ${passed} assertions PASSED`);
if (failed > 0) {
  console.error(`FAILED: ${failed} assertions failed!`);
  for (const f of failures) {
    console.error(`  - ${f}`);
  }
  process.exit(1);
} else {
  console.log('REALITY GATE SUCCESS: All assertions PASS');
}
console.log('======================================================================');
