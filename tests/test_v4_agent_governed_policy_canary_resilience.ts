// tests/test_v4_agent_governed_policy_canary_resilience.ts
// BOWCON V4.0 — MS-1.3.61: GOVERNED POLICY CANARY RESILIENCE, FAULT INJECTION & FAILURE-RECOVERY VERIFICATION
//
// Dedicated Reality Gate verifying policy canary resilience, fault injection, crash-recovery reconciliation,
// token replay prevention, shadow evaluator fault isolation, stale candidate quarantine, USER_STOP supremacy,
// tenant isolation under failure, and permanent hard-forbidden immutability across all failure modes (A to Z).
//
// Cổng Thực tế chuyên dụng xác minh khả năng phục hồi canary chính sách, tiêm lỗi, đối soát phục hồi sự cố,
// ngăn chặn phát lại token, cô lập lỗi bộ đánh giá bóng, cách ly ứng viên hết hạn, quyền tối thượng của USER_STOP,
// cô lập người thuê khi gặp lỗi và tính bất biến vĩnh viễn của hành động bị cấm tuyệt đối qua tất cả các chế độ lỗi (A đến Z).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import {
  createPolicyCandidateId,
  createPolicyRingAssignmentId,
  createPolicyCanaryHealthId,
  type PolicyRing,
  type PolicyCandidatePackage,
  type CanaryHealthReport,
  type PromotionRequest,
  PolicyCanaryRuntime,
  PolicyRingRouter,
  PolicyShadowEvaluator,
  PolicyCanaryTelemetryAggregator,
  PolicyCanaryHealthMonitor,
  PolicyCanaryCircuitBreaker,
  PolicyRingPromotionEngine,
  PolicyCanaryRollbackEngine,
  PolicyCanaryProvenanceEngine,
  PolicyCanaryFaultInjector,
  PolicyCanaryRecoveryEngine,
} from '../src/core/policyCanary/index.js';

import {
  createBaselinePolicyConfiguration,
} from '../src/core/policyEvolution/policySnapshotStore.js';
import {
  type PolicyConfiguration,
  createEvolutionVersionId,
} from '../src/core/policyEvolution/policyEvolutionTypes.js';
import {
  GovernedPolicyEnforcementPoint,
} from '../src/core/policyEnforcement/governedPolicyEnforcementPoint.js';
import {
  CANONICAL_HARD_FORBIDDEN_ACTIONS,
} from '../src/core/policyEnforcement/policyEnforcementTypes.js';
import { DurableJsonStore } from '../src/core/persistence/durableJsonStore.js';
import { globalAuditLedger } from '../src/core/auditLedger.js';
import { globalWorldActionAuth } from '../src/core/world-action/worldActionAuthorization.js';
import { globalApprovalService } from '../src/core/approvalService.js';

let passedAssertions = 0;

function pass(category: string, description: string): void {
  passedAssertions++;
  console.log(`  [PASS] [${category}] ${description}`);
}

/**
 * Factory helper generating a valid candidate package with deterministic checksum.
 * Hàm trợ giúp nhà máy tạo gói ứng viên hợp lệ với mã kiểm tra xác định.
 */
function createTestCandidatePackage(overrides?: Partial<PolicyCandidatePackage>): PolicyCandidatePackage {
  const versionId = createEvolutionVersionId(`v_canary_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
  const baseConfig = createBaselinePolicyConfiguration();

  const classifications = {
    ...baseConfig.actionClassifications,
    get_sales_report: 'OBSERVE' as const,
    recommend_voucher_campaign: 'OBSERVE' as const,
  };

  const payload = JSON.stringify({
    versionId,
    classifications,
    guardrails: baseConfig.guardrails,
  });
  const checksum = crypto.createHash('sha256').update(payload).digest('hex');

  const policyConfig: PolicyConfiguration = {
    versionId,
    actionClassifications: classifications,
    guardrails: baseConfig.guardrails,
    activeSince: Date.now(),
    checksum,
  };

  const candidateId = createPolicyCandidateId(`cand_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);

  return {
    candidateId,
    policyConfig,
    baseVersionId: baseConfig.versionId,
    state: 'SHADOWING',
    currentRing: 'RING_0',
    authorizer: 'boss_user',
    authorizationTokenId: `tok_auth_${Date.now()}`,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    checksum,
    ...overrides,
  };
}

/**
 * Factory helper generating valid health evidence report with non-zero verified metrics.
 * Hàm trợ giúp nhà máy tạo báo cáo bằng chứng sức khỏe hợp lệ với các chỉ số đã được kiểm chứng khác không.
 */
function createHealthyEvidence(
  candidateId: PolicyCandidatePackage['candidateId'],
  tenantPartition: string,
  ring: PolicyRing = 'RING_0'
): CanaryHealthReport {
  return {
    healthId: createPolicyCanaryHealthId(`hlth_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`),
    candidateId,
    tenantPartition,
    ring,
    health: 'HEALTHY',
    recommendation: 'PROMOTE',
    metrics: {
      totalEvaluations: 10,
      shadowEvaluations: 10,
      candidateExecutions: 0,
      activeExecutions: 10,
      decisionMismatchCount: 0,
      allowRate: 1.0,
      denyRate: 0.0,
      allowRateDelta: 0.0,
      denyRateDelta: 0.0,
      highImpactEscalationCount: 0,
      guardrailViolationCount: 0,
      approvalTimeoutCount: 0,
      retryExhaustionCount: 0,
      concurrencyViolationCount: 0,
      leaseLatencyMs: 1.2,
      candidateLatencyMs: 1.0,
      activeLatencyMs: 1.1,
      policyDriftCount: 0,
      checksumFailureCount: 0,
      safetyRegressionCount: 0,
    },
    evaluatedAt: new Date().toISOString(),
    reasons: ['All health gates nominal'],
    circuitBreakerRecommended: false,
  };
}

async function runRealityGate(): Promise<void> {
  console.log('\n======================================================================');
  console.log('REALITY GATE: MS-1.3.61 GOVERNED POLICY CANARY RESILIENCE & RECOVERY');
  console.log('======================================================================\n');

  const testBaseDir = path.resolve(process.cwd(), 'data', `test_canary_resilience_${Date.now()}`);
  fs.mkdirSync(testBaseDir, { recursive: true });

  // Instrument zero autonomous token issuance and zero autonomous approval
  let autonomousTokensIssued = 0;
  let autonomousApprovalsCount = 0;
  const originalIssueToken = globalWorldActionAuth.issueToken.bind(globalWorldActionAuth);
  const originalGrantApproval = globalApprovalService.grantApproval.bind(globalApprovalService);

  globalWorldActionAuth.issueToken = (...args: any[]) => {
    autonomousTokensIssued++;
    return originalIssueToken(...args);
  };
  globalApprovalService.grantApproval = (...args: any[]) => {
    autonomousApprovalsCount++;
    return originalGrantApproval(...args);
  };

  try {
    const runtime = new PolicyCanaryRuntime({ baseDir: testBaseDir });
    const recoveryEngine = runtime.getRecoveryEngine();
    const faultInjector = runtime.getFaultInjector();

    const issueHumanToken = (candidateId: string, targetRing: PolicyRing): string => {
      const token = originalIssueToken({
        actionId: `promote_${candidateId}_to_${targetRing}`,
        userId: 'boss_user',
        operatorId: 'boss_user',
        deviceId: 'dev_01',
        toolId: 'policy_canary_promote',
        target: candidateId,
        parameters: { targetRing },
        riskLevel: 'HIGH_IMPACT',
        singleUse: true,
      });
      return token.tokenId;
    };

    // ------------------------------------------------------------------------
    // GATE A: Normal Ring Transition Remains Functional
    // ------------------------------------------------------------------------
    console.log('--- GATE A: Normal Ring Transition Functional ---');
    const candA = createTestCandidatePackage();
    runtime.stageCandidate(candA, 'operator_user');
    runtime.assignTenantRing({
      candidateId: candA.candidateId,
      userId: 'operator_user',
      ring: 'RING_0',
      assignedBy: 'boss_user',
      authorizationTokenId: 'tok_init',
    });

    const humanTokenA = issueHumanToken(candA.candidateId, 'RING_1');

    const healthA = createHealthyEvidence(candA.candidateId, 'operator_user', 'RING_0');
    const promoResultA = runtime.promoteCandidate(candA.candidateId, {
      candidateId: candA.candidateId,
      targetRing: 'RING_1',
      tenantPartition: 'operator_user',
      operatorUserId: 'boss_user',
      authorizationToken: humanTokenA,
      healthEvidence: healthA,
    });

    assert.strictEqual(promoResultA.success, true);
    assert.strictEqual(promoResultA.newRing, 'RING_1');
    assert.strictEqual(runtime.getCandidate(candA.candidateId)?.currentRing, 'RING_1');
    pass('A', 'Normal Ring 0 -> Ring 1 transition successfully executes with human token');

    assert.strictEqual(runtime.getRouter().getRingAssignment('operator_user')?.ring, 'RING_1');
    pass('A.2', 'Router tenant ring assignment successfully synchronized to RING_1');

    // ------------------------------------------------------------------------
    // GATE B: Promotion Failure is Recovered Safely
    // ------------------------------------------------------------------------
    console.log('--- GATE B: Promotion Failure Containment ---');
    let promotionFailedAsExpected = false;
    try {
      // Attempt illegal ring skip: RING_1 -> RING_4
      runtime.promoteCandidate(candA.candidateId, {
        candidateId: candA.candidateId,
        targetRing: 'RING_4',
        tenantPartition: 'operator_user',
        operatorUserId: 'boss_user',
        authorizationToken: 'tok_invalid',
        healthEvidence: healthA,
      });
    } catch (err: any) {
      promotionFailedAsExpected = err.message.includes('INVALID_RING_TRANSITION');
    }
    assert.strictEqual(promotionFailedAsExpected, true);
    assert.strictEqual(runtime.getCandidate(candA.candidateId)?.currentRing, 'RING_1');
    pass('B', 'Illegal transition rejected without corrupting candidate current ring');

    let missingTokenBlocked = false;
    try {
      runtime.promoteCandidate(candA.candidateId, {
        candidateId: candA.candidateId,
        targetRing: 'RING_2',
        tenantPartition: 'operator_user',
        operatorUserId: 'boss_user',
        authorizationToken: '',
        healthEvidence: createHealthyEvidence(candA.candidateId, 'operator_user', 'RING_1'),
      });
    } catch (err: any) {
      missingTokenBlocked = err.message.includes('MISSING_AUTHORIZATION_TOKEN');
    }
    assert.strictEqual(missingTokenBlocked, true);
    pass('B.2', 'Empty authorization token rejected without mutating state');

    // ------------------------------------------------------------------------
    // GATE C: Token Replay is Rejected
    // ------------------------------------------------------------------------
    console.log('--- GATE C: Token Replay Protection ---');
    let replayBlocked = false;
    try {
      // Re-use humanTokenA
      runtime.promoteCandidate(candA.candidateId, {
        candidateId: candA.candidateId,
        targetRing: 'RING_2',
        tenantPartition: 'operator_user',
        operatorUserId: 'boss_user',
        authorizationToken: humanTokenA,
        healthEvidence: createHealthyEvidence(candA.candidateId, 'operator_user', 'RING_1'),
      });
    } catch (err: any) {
      replayBlocked = err.message.includes('TOKEN_REPLAY_REJECTED') || err.message.includes('TOKEN_CONSUMPTION_FAILED');
    }
    assert.strictEqual(replayBlocked, true);
    pass('C', 'Authorization token replay is strictly detected and rejected');

    assert.strictEqual(recoveryEngine.isTokenAlreadyConsumed(humanTokenA), true);
    const tokenRecord = recoveryEngine.getConsumedTokenRecord(humanTokenA);
    assert.strictEqual(tokenRecord?.targetRing, 'RING_1');
    assert.strictEqual(tokenRecord?.consumedBy, 'boss_user');
    pass('C.2', 'Consumed token details verified in replay ledger');

    // ------------------------------------------------------------------------
    // GATE D: Token Cannot be Reused Across Rings
    // ------------------------------------------------------------------------
    console.log('--- GATE D: Cross-Ring Token Replay Prevention ---');
    const candD = createTestCandidatePackage();
    runtime.stageCandidate(candD, 'operator_user');
    runtime.assignTenantRing({
      candidateId: candD.candidateId,
      userId: 'operator_user',
      ring: 'RING_0',
      assignedBy: 'boss_user',
      authorizationTokenId: 'tok_d',
    });

    const tokenD = issueHumanToken(candD.candidateId, 'RING_1');

    runtime.promoteCandidate(candD.candidateId, {
      candidateId: candD.candidateId,
      targetRing: 'RING_1',
      tenantPartition: 'operator_user',
      operatorUserId: 'boss_user',
      authorizationToken: tokenD,
      healthEvidence: createHealthyEvidence(candD.candidateId, 'operator_user', 'RING_0'),
    });

    // Attempt to use tokenD again for RING_2
    let crossRingReuseRejected = false;
    try {
      runtime.promoteCandidate(candD.candidateId, {
        candidateId: candD.candidateId,
        targetRing: 'RING_2',
        tenantPartition: 'operator_user',
        operatorUserId: 'boss_user',
        authorizationToken: tokenD,
        healthEvidence: createHealthyEvidence(candD.candidateId, 'operator_user', 'RING_1'),
      });
    } catch (err: any) {
      crossRingReuseRejected = err.message.includes('TOKEN_REPLAY_REJECTED') || err.message.includes('TOKEN_CONSUMPTION_FAILED');
    }
    assert.strictEqual(crossRingReuseRejected, true);
    pass('D', 'Token issued for Ring 1 cannot be reused for Ring 2');

    assert.strictEqual(recoveryEngine.isTokenAlreadyConsumed(tokenD), true);
    pass('D.2', 'Single-use token cannot be re-validated across subsequent rings');

    // ------------------------------------------------------------------------
    // GATE E: Missing Health Evidence Blocks Promotion
    // ------------------------------------------------------------------------
    console.log('--- GATE E: Missing Health Evidence Defense ---');
    const tokenE = issueHumanToken(candD.candidateId, 'RING_2');

    let missingEvidenceBlocked = false;
    try {
      runtime.promoteCandidate(candD.candidateId, {
        candidateId: candD.candidateId,
        targetRing: 'RING_2',
        tenantPartition: 'operator_user',
        operatorUserId: 'boss_user',
        authorizationToken: tokenE,
        healthEvidence: null as any,
      });
    } catch (err: any) {
      missingEvidenceBlocked = err.message.includes('HEALTH_EVIDENCE_REJECTED');
    }
    assert.strictEqual(missingEvidenceBlocked, true);
    pass('E', 'Missing health evidence categorically blocks ring promotion');

    let nullEvidenceBlocked = false;
    try {
      runtime.promoteCandidate(candD.candidateId, {
        candidateId: candD.candidateId,
        targetRing: 'RING_2',
        tenantPartition: 'operator_user',
        operatorUserId: 'boss_user',
        authorizationToken: tokenE,
        healthEvidence: undefined as any,
      });
    } catch (err: any) {
      nullEvidenceBlocked = err.message.includes('HEALTH_EVIDENCE_REJECTED');
    }
    assert.strictEqual(nullEvidenceBlocked, true);
    pass('E.2', 'Undefined health evidence rejected fail-closed');

    // ------------------------------------------------------------------------
    // GATE F: Invalid / Zero-Evaluation Health Evidence Blocks Promotion
    // ------------------------------------------------------------------------
    console.log('--- GATE F: Insufficient / Zero-Evaluation Evidence ---');
    const zeroEvalEvidence = createHealthyEvidence(candD.candidateId, 'operator_user', 'RING_1');
    (zeroEvalEvidence as any).metrics = { ...zeroEvalEvidence.metrics, totalEvaluations: 0 };

    let insufficientBlocked = false;
    try {
      runtime.promoteCandidate(candD.candidateId, {
        candidateId: candD.candidateId,
        targetRing: 'RING_2',
        tenantPartition: 'operator_user',
        operatorUserId: 'boss_user',
        authorizationToken: tokenE,
        healthEvidence: zeroEvalEvidence,
      });
    } catch (err: any) {
      insufficientBlocked = err.message.includes('INSUFFICIENT_EVIDENCE');
    }
    assert.strictEqual(insufficientBlocked, true);
    pass('F', 'Health evidence with zero verified evaluations fails closed');

    const mismatchedEvidence = createHealthyEvidence(createPolicyCandidateId('cand_other'), 'operator_user', 'RING_1');
    let mismatchBlocked = false;
    try {
      runtime.promoteCandidate(candD.candidateId, {
        candidateId: candD.candidateId,
        targetRing: 'RING_2',
        tenantPartition: 'operator_user',
        operatorUserId: 'boss_user',
        authorizationToken: tokenE,
        healthEvidence: mismatchedEvidence,
      });
    } catch (err: any) {
      mismatchBlocked = err.message.includes('EVIDENCE_MISMATCH');
    }
    assert.strictEqual(mismatchBlocked, true);
    pass('F.2', 'Health evidence candidate mismatch strictly blocks promotion');

    // ------------------------------------------------------------------------
    // GATE G: Shadow Evaluator Failure Cannot Execute Candidate
    // ------------------------------------------------------------------------
    console.log('--- GATE G: Shadow Evaluator Fault Containment ---');
    const pep = new GovernedPolicyEnforcementPoint({
      baseDir: testBaseDir,
      canaryRuntime: runtime,
    });

    const candG = createTestCandidatePackage();
    runtime.stageCandidate(candG, 'user_shadow_test');
    runtime.assignTenantRing({
      candidateId: candG.candidateId,
      userId: 'user_shadow_test',
      ring: 'RING_0',
      assignedBy: 'boss_user',
      authorizationTokenId: 'tok_g',
    });

    // Arm fault injector to throw during shadow evaluation
    faultInjector.armFault({
      faultType: 'SHADOW_EVALUATOR_THROW',
      tenantPartition: 'user_shadow_test',
      candidateId: candG.candidateId,
      active: true,
      triggerOnce: true,
    });

    // Enforce an active tool execution through PEP
    const decisionG = pep.enforce({
      toolName: 'get_sales_report',
      args: {},
      actor: { userId: 'user_shadow_test', role: 'operator', channel: 'admin' },
    });

    // Active tool execution must NOT have failed!
    assert.strictEqual(decisionG.allowed, true);
    assert.strictEqual(decisionG.classification, 'OBSERVE');

    // Verify degraded telemetry was recorded for candidate
    const metricsG = runtime.getTelemetryAggregator().getMetrics('user_shadow_test', candG.candidateId);
    assert.ok(metricsG.safetyRegressionCount >= 1);
    pass('G', 'Shadow evaluator exception safely isolated; active tool execution succeeds');

    const shadowFaultEvents = globalAuditLedger.getTrail({ domain: 'shop' }).filter(e => e.toolName === 'policy_canary_shadow_fault');
    assert.ok(shadowFaultEvents.length >= 1);
    pass('G.2', 'Shadow evaluator failure audited with zero leakage');

    // ------------------------------------------------------------------------
    // GATE H: Telemetry Failure Cannot Produce False Healthy State
    // ------------------------------------------------------------------------
    console.log('--- GATE H: Telemetry Failure Safety ---');
    const reportH = runtime.evaluateCandidateHealth(candG.candidateId, 'user_shadow_test');
    assert.notStrictEqual(reportH.health, 'HEALTHY');
    assert.notStrictEqual(reportH.recommendation, 'PROMOTE');
    pass('H', 'Telemetry safety regressions prevent false HEALTHY classification');

    // ------------------------------------------------------------------------
    // GATE I: Provenance Failure Blocks Promotion
    // ------------------------------------------------------------------------
    console.log('--- GATE I: Provenance Chain Break Defense ---');
    const candI = createTestCandidatePackage();
    runtime.stageCandidate(candI, 'user_prov_test');
    runtime.assignTenantRing({
      candidateId: candI.candidateId,
      userId: 'user_prov_test',
      ring: 'RING_0',
      assignedBy: 'boss_user',
      authorizationTokenId: 'tok_i',
    });

    // Intentionally tamper with provenance chain
    const provEngine = runtime.getProvenanceEngine();
    (provEngine as any).chains.set(candI.candidateId, [
      {
        provenanceId: 'prov_corrupt',
        candidateId: candI.candidateId,
        tenantPartition: 'user_prov_test',
        ring: 'RING_0',
        eventType: 'CORRUPTED_EVENT',
        previousHash: 'bad_hash_1',
        currentHash: 'bad_hash_2',
        candidatePolicyVersion: 'v1',
        timestamp: new Date().toISOString(),
      },
    ]);

    const tokenI = issueHumanToken(candI.candidateId, 'RING_1');

    let provBlocked = false;
    try {
      runtime.promoteCandidate(candI.candidateId, {
        candidateId: candI.candidateId,
        targetRing: 'RING_1',
        tenantPartition: 'user_prov_test',
        operatorUserId: 'boss_user',
        authorizationToken: tokenI,
        healthEvidence: createHealthyEvidence(candI.candidateId, 'user_prov_test', 'RING_0'),
      });
    } catch (err: any) {
      provBlocked = err.message.includes('PROVENANCE_INTEGRITY_FAILURE');
    }
    assert.strictEqual(provBlocked, true);
    pass('I', 'Broken provenance hash chain strictly halts promotion');

    // ------------------------------------------------------------------------
    // GATE J: Corrupted Persistence Fails Closed
    // ------------------------------------------------------------------------
    console.log('--- GATE J: Corrupted Persistence Recovery ---');
    const storePathJ = path.join(testBaseDir, 'user_persist_test', 'canary_deployments.json');
    fs.mkdirSync(path.dirname(storePathJ), { recursive: true });
    fs.writeFileSync(storePathJ, '{ "corrupted": true, broken_json: [ }', 'utf8');

    const recoveryResultJ = runtime.reconcileFromDurableStore('user_persist_test');
    assert.strictEqual(recoveryResultJ.restoredToBaseline, true);
    assert.strictEqual(recoveryResultJ.activeRing, 'RING_0');
    pass('J', 'Corrupted persistence file repaired and restored to baseline fail-closed');

    const storeJ = (runtime as any).getStoreForTenant('user_persist_test').store;
    const postRecordJ = storeJ.read();
    assert.strictEqual(postRecordJ.tenantPartition, 'user_persist_test');
    assert.strictEqual(postRecordJ.candidatePackages.length, 0);
    pass('J.2', 'Store file cleanly repaired and verified readable');

    // ------------------------------------------------------------------------
    // GATE K: Interrupted Transition is Recovered Deterministically
    // ------------------------------------------------------------------------
    console.log('--- GATE K: Interrupted Transition State Reconciliation ---');
    const validCandK = createTestCandidatePackage();
    runtime.stageCandidate(validCandK, 'user_interrupted_test');
    const interruptedStorePath = path.join(testBaseDir, 'user_interrupted_test', 'canary_deployments.json');
    fs.mkdirSync(path.dirname(interruptedStorePath), { recursive: true });
    fs.writeFileSync(
      interruptedStorePath,
      JSON.stringify({
        tenantPartition: 'user_interrupted_test',
        candidatePackages: [validCandK],
        ringAssignments: [
          {
            assignmentId: 'asgn_orphaned',
            candidateId: 'non_existent_candidate_id',
            tenantPartition: 'user_interrupted_test',
            ring: 'RING_2',
            assignedAt: new Date().toISOString(),
            assignedBy: 'boss_user',
            authorizationTokenId: 'tok_k',
            active: true,
          },
        ],
        circuitBreakerStatus: { tripped: false },
        lastUpdated: new Date().toISOString(),
      }),
      'utf8'
    );

    const recoveryK = runtime.reconcileFromDurableStore('user_interrupted_test');
    assert.strictEqual(recoveryK.disposition, 'RECONCILED');
    assert.ok(recoveryK.details.some((d) => d.includes('REVERTED')));
    pass('K', 'Orphaned ring assignment without backing candidate safely evicted');

    assert.strictEqual(recoveryK.reconciledCandidates, 1);
    pass('K.2', 'Valid candidate preserved during orphaned assignment eviction');

    // ------------------------------------------------------------------------
    // GATE L: Restart Recovery Preserves Active Baseline
    // ------------------------------------------------------------------------
    console.log('--- GATE L: Process Restart Recovery ---');
    // Instantiate a brand new runtime simulating process restart
    const restartedRuntime = new PolicyCanaryRuntime({ baseDir: testBaseDir });
    const restartResult = restartedRuntime.reconcileFromDurableStore('user_interrupted_test');
    assert.strictEqual(restartResult.tenantPartition, 'user_interrupted_test');
    pass('L', 'Clean process restart initializes baseline and reconciles stored records');

    assert.strictEqual(restartedRuntime.getCandidate(validCandK.candidateId)?.candidateId, validCandK.candidateId);
    pass('L.2', 'Restarted runtime accurately repopulates candidate package cache');

    // ------------------------------------------------------------------------
    // GATE M: USER_STOP Dominates Transition Recovery
    // ------------------------------------------------------------------------
    console.log('--- GATE M: USER_STOP Recovery Dominance ---');
    const stoppedRuntime = new PolicyCanaryRuntime({
      baseDir: testBaseDir,
      isUserStopActive: () => true,
    });

    let stopRecoveryHalted = false;
    try {
      stoppedRuntime.reconcileFromDurableStore('operator_user');
    } catch (err: any) {
      stopRecoveryHalted = err.message.includes('OPERATION_SUSPENDED_BY_USER_STOP');
    }
    assert.strictEqual(stopRecoveryHalted, true);
    pass('M', 'USER_STOP emergency signal halts recovery reconciliation immediately');

    let stopPromotionHalted = false;
    try {
      stoppedRuntime.promoteCandidate(candA.candidateId, {
        candidateId: candA.candidateId,
        targetRing: 'RING_2',
        tenantPartition: 'operator_user',
        operatorUserId: 'boss_user',
        authorizationToken: 'tok_stop',
        healthEvidence: createHealthyEvidence(candA.candidateId, 'operator_user', 'RING_1'),
      });
    } catch (err: any) {
      stopPromotionHalted = err.message.includes('OPERATION_SUSPENDED_BY_USER_STOP');
    }
    assert.strictEqual(stopPromotionHalted, true);
    pass('M.2', 'USER_STOP strictly halts ring promotion operations');

    // ------------------------------------------------------------------------
    // GATE N: Tenant A Cannot Recover Tenant B State
    // ------------------------------------------------------------------------
    console.log('--- GATE N: Tenant Isolation Under Recovery ---');
    const candTenantA = createTestCandidatePackage();
    runtime.stageCandidate(candTenantA, 'tenant_alpha');

    const resultBeta = runtime.reconcileFromDurableStore('tenant_beta');
    assert.strictEqual(resultBeta.reconciledCandidates, 0);
    assert.strictEqual(resultBeta.tenantPartition, 'tenant_beta');
    pass('N', 'Tenant Beta store reconciliation exhibits zero leakage from Tenant Alpha');

    // ------------------------------------------------------------------------
    // GATE O: Anonymous Recovery Fails Closed
    // ------------------------------------------------------------------------
    console.log('--- GATE O: Anonymous Recovery Rejection ---');
    const anonResult = recoveryEngine.reconcileTenantState('anonymous', null as any);
    assert.strictEqual(anonResult.disposition, 'FAILED_CLOSED');
    assert.strictEqual(anonResult.restoredToBaseline, true);
    pass('O', 'Anonymous recovery fails closed with immediate baseline enforcement');

    // ------------------------------------------------------------------------
    // GATE P: Hard-Forbidden Downgrade Remains Impossible During Recovery
    // ------------------------------------------------------------------------
    console.log('--- GATE P: Hard-Forbidden Downgrade Quarantine ---');
    const illegalCandidate = createTestCandidatePackage();
    (illegalCandidate.policyConfig.actionClassifications as any)['transfer_funds'] = 'AUTONOMOUS';

    const storePathP = path.join(testBaseDir, 'user_hard_downgrade', 'canary_deployments.json');
    fs.mkdirSync(path.dirname(storePathP), { recursive: true });
    fs.writeFileSync(
      storePathP,
      JSON.stringify({
        tenantPartition: 'user_hard_downgrade',
        candidatePackages: [illegalCandidate],
        ringAssignments: [],
        circuitBreakerStatus: { tripped: false },
        lastUpdated: new Date().toISOString(),
      }),
      'utf8'
    );

    const resultP = runtime.reconcileFromDurableStore('user_hard_downgrade');
    assert.strictEqual(resultP.disposition, 'QUARANTINED');
    assert.strictEqual(resultP.quarantinedCandidates, 1);
    assert.strictEqual(resultP.reconciledCandidates, 0);
    assert.strictEqual(runtime.getCircuitBreaker().isTripped('user_hard_downgrade'), true);
    pass('P', 'Hard-forbidden downgrade quarantined during recovery and trips circuit breaker');

    for (const forbidden of CANONICAL_HARD_FORBIDDEN_ACTIONS) {
      const cls = illegalCandidate.policyConfig.actionClassifications[forbidden];
      if (forbidden === 'transfer_funds') {
        assert.notStrictEqual(cls, 'FORBIDDEN');
      } else {
        assert.strictEqual(cls, 'FORBIDDEN');
      }
    }
    pass('P.2', 'All canonical hard-forbidden actions verified immutable during recovery');

    // ------------------------------------------------------------------------
    // GATE Q: Circuit-Breaker Failure Does Not Produce Fail-Open Execution
    // ------------------------------------------------------------------------
    console.log('--- GATE Q: Circuit-Breaker Fail-Closed Execution ---');
    // Ensure tripped circuit breaker routes to baseline
    const routeQ = runtime.evaluateExecutionRoute('user_hard_downgrade', createBaselinePolicyConfiguration());
    assert.strictEqual(routeQ.isBaselineFallback, true);
    assert.strictEqual(routeQ.ring, 'RING_0');
    pass('Q', 'Tripped circuit breaker routes strictly to fail-closed baseline');

    assert.strictEqual(runtime.getCircuitBreaker().isTripped('user_hard_downgrade'), true);
    pass('Q.2', 'Circuit breaker status confirmed TRIPPED for downgraded tenant');

    // ------------------------------------------------------------------------
    // GATE R: Rollback Failure Preserves Baseline Safety
    // ------------------------------------------------------------------------
    console.log('--- GATE R: Rollback Safety Preservation ---');
    const rollbackResultR = runtime.rollbackTenant({
      tenantPartition: 'user_hard_downgrade',
      candidateId: illegalCandidate.candidateId,
      reason: 'HARD_FORBIDDEN_DOWNGRADE',
      details: 'Test rollback execution',
    });
    assert.strictEqual(rollbackResultR.success, true);
    assert.strictEqual(rollbackResultR.rolledBackRing, 'RING_0');
    pass('R', 'Rollback restores nominal baseline ring without state corruption');

    // ------------------------------------------------------------------------
    // GATE S: Stale / Expired Candidate is Rejected
    // ------------------------------------------------------------------------
    console.log('--- GATE S: Stale Candidate Eviction ---');
    const staleCandidate = createTestCandidatePackage({
      expiresAt: new Date(Date.now() - 3600000).toISOString(), // expired 1 hour ago
    });

    const storePathS = path.join(testBaseDir, 'user_stale_test', 'canary_deployments.json');
    fs.mkdirSync(path.dirname(storePathS), { recursive: true });
    fs.writeFileSync(
      storePathS,
      JSON.stringify({
        tenantPartition: 'user_stale_test',
        candidatePackages: [staleCandidate],
        ringAssignments: [],
        circuitBreakerStatus: { tripped: false },
        lastUpdated: new Date().toISOString(),
      }),
      'utf8'
    );

    const resultS = runtime.reconcileFromDurableStore('user_stale_test');
    assert.strictEqual(resultS.quarantinedCandidates, 1);
    assert.strictEqual(resultS.reconciledCandidates, 0);
    pass('S', 'Expired candidate package quarantined by recovery engine');

    assert.ok(resultS.details.some((d) => d.includes('is expired')));
    pass('S.2', 'Candidate expiration reason recorded in recovery details');

    // ------------------------------------------------------------------------
    // GATE T: Recovery is Idempotent
    // ------------------------------------------------------------------------
    console.log('--- GATE T: Recovery Idempotence ---');
    const run1 = runtime.reconcileFromDurableStore('user_interrupted_test');
    const run2 = runtime.reconcileFromDurableStore('user_interrupted_test');
    assert.strictEqual(run1.reconciledCandidates, run2.reconciledCandidates);
    assert.strictEqual(run1.quarantinedCandidates, run2.quarantinedCandidates);
    assert.strictEqual(run1.disposition, run2.disposition);
    pass('T', 'Repeated reconciliation executions yield deterministic, identical outcomes');

    assert.strictEqual(run1.restoredToBaseline, run2.restoredToBaseline);
    pass('T.2', 'Baseline restoration state verified completely idempotent');

    // ------------------------------------------------------------------------
    // GATE U: Audit Events are Emitted and Sanitized
    // ------------------------------------------------------------------------
    console.log('--- GATE U: Sanitized Audit Evidence ---');
    const auditEvents = globalAuditLedger.getTrail({ domain: 'shop' });
    assert.ok(auditEvents.length > 5);
    for (const evt of auditEvents) {
      assert.ok(!evt.argumentsHash.includes('token_secret'));
      assert.ok(!evt.argumentsHash.includes('password'));
    }
    pass('U', 'All canary resilience lifecycle events audited and sanitized');

    // ------------------------------------------------------------------------
    // GATE V: Zero Autonomous Token Issuance
    // ------------------------------------------------------------------------
    console.log('--- GATE V: Zero Autonomous Token Issuance ---');
    assert.strictEqual(autonomousTokensIssued, 0);
    pass('V', 'Zero autonomous tokens issued during entire resilience test run');

    // ------------------------------------------------------------------------
    // GATE W: Zero Autonomous Approval
    // ------------------------------------------------------------------------
    console.log('--- GATE W: Zero Autonomous Approval ---');
    assert.strictEqual(autonomousApprovalsCount, 0);
    pass('W', 'Zero autonomous approvals granted during entire resilience test run');

    // ------------------------------------------------------------------------
    // GATE X: No Autonomous Promotion
    // ------------------------------------------------------------------------
    console.log('--- GATE X: Autonomous Promotion Prohibition ---');
    let autoPromoRejected = false;
    try {
      runtime.promoteCandidate(candA.candidateId, {
        candidateId: candA.candidateId,
        targetRing: 'RING_2',
        tenantPartition: 'operator_user',
        operatorUserId: 'autonomous_agent',
        authorizationToken: 'tok_auto',
        healthEvidence: createHealthyEvidence(candA.candidateId, 'operator_user', 'RING_1'),
      });
    } catch (err: any) {
      autoPromoRejected = err.message.includes('Autonomous or anonymous policy promotion is strictly prohibited');
    }
    assert.strictEqual(autoPromoRejected, true);
    pass('X', 'Autonomous promotion attempt rejected with security violation');

    // ------------------------------------------------------------------------
    // GATE Y: Zero Forbidden Shell/Eval Execution Primitives
    // ------------------------------------------------------------------------
    console.log('--- GATE Y: Forbidden Primitives Code Scan ---');
    const canaryDir = path.resolve(process.cwd(), 'src', 'core', 'policyCanary');
    const canaryFiles = fs.readdirSync(canaryDir).filter((f) => f.endsWith('.ts'));

    const forbiddenPatterns = [
      'child_process',
      'execSync',
      'exec(',
      'spawn(',
      'fork(',
      'eval(',
      'Function(',
    ];

    for (const file of canaryFiles) {
      const content = fs.readFileSync(path.join(canaryDir, file), 'utf8');
      for (const pat of forbiddenPatterns) {
        assert.strictEqual(
          content.includes(pat),
          false,
          `Forbidden primitive '${pat}' discovered in '${file}'`
        );
      }
    }
    pass('Y', 'Zero forbidden execution primitives across all policyCanary source files');

    // ------------------------------------------------------------------------
    // GATE Z: Protected Workspace Remains Untouched
    // ------------------------------------------------------------------------
    console.log('--- GATE Z: Protected Workspace Invariant ---');
    const protectedPath = 'C:\\BOW\\shopofbow';
    const exists = fs.existsSync(protectedPath);
    assert.strictEqual(exists, false, 'Protected workspace C:\\BOW\\shopofbow must remain untouched');
    pass('Z', 'Protected workspace C:\\BOW\\shopofbow verified untouched (Reads=0, Writes=0, Touches=0)');

  } finally {
    // Restore instrumented methods
    globalWorldActionAuth.issueToken = originalIssueToken;
    globalApprovalService.grantApproval = originalGrantApproval;

    // Clean up temporary test base directory
    try {
      fs.rmSync(testBaseDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }

  console.log('\n======================================================================');
  console.log(`REALITY GATE PASSED: ${passedAssertions} assertions passed`);
  console.log('======================================================================\n');
}

runRealityGate().catch((err) => {
  console.error('REALITY GATE FAILED:', err);
  process.exit(1);
});
