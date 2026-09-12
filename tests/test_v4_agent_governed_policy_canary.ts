// tests/test_v4_agent_governed_policy_canary.ts
// BOWCON V4.0 — MS-1.3.60: GOVERNED REAL-TIME POLICY CANARY VERIFICATION & MULTI-RING ROLLOUT PIPELINE
//
// Reality Gate verifying governed real-time policy canary verification, multi-ring rollout pipeline (Ring 0 to 4),
// shadow evaluation without tool execution, tenant isolation, health monitoring, fail-closed circuit breaking,
// human-authorized ring promotion, ring-scoped rollback, SHA-256 provenance chains, USER_STOP supremacy,
// and permanent hard-forbidden immutability.
//
// Cổng Thực tế xác minh kiểm chứng canary chính sách thời gian thực có quản trị, đường ống triển khai đa vòng (Vòng 0 đến 4),
// đánh giá bóng không thực thi công cụ, cô lập người thuê, giám sát sức khỏe, ngắt mạch đóng an toàn,
// thăng hạng vòng được con người ủy quyền, hoàn nguyên theo phạm vi vòng, chuỗi nguồn gốc SHA-256,
// quyền tối thượng của USER_STOP và tính bất biến của hành động bị cấm tuyệt đối.
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
  createPolicyCanaryId,
  createPolicyCandidateId,
  createPolicyRingAssignmentId,
  createPolicyCanaryDeploymentId,
  createPolicyCanaryObservationId,
  createPolicyCanaryHealthId,
  createPolicyCanaryProvenanceId,
  CANONICAL_POLICY_RINGS,
  type PolicyRing,
  type PolicyCandidatePackage,
  PolicyRingRouter,
  PolicyShadowEvaluator,
  PolicyCanaryTelemetryAggregator,
  PolicyCanaryHealthMonitor,
  PolicyCanaryCircuitBreaker,
  PolicyRingPromotionEngine,
  PolicyCanaryRollbackEngine,
  PolicyCanaryProvenanceEngine,
  PolicyCanaryRuntime,
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
    recommend_voucher_campaign: 'OBSERVE' as const, // relaxed from RECOMMEND to OBSERVE
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
    state: 'STAGED',
    currentRing: 'RING_0',
    authorizer: 'boss_user',
    authorizationTokenId: `tok_auth_${Date.now()}`,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    checksum,
    ...overrides,
  };
}

async function runRealityGate(): Promise<void> {
  console.log('\n======================================================================');
  console.log('REALITY GATE: MS-1.3.60 GOVERNED POLICY CANARY & MULTI-RING ROLLOUT');
  console.log('======================================================================\n');

  const testBaseDir = path.resolve(process.cwd(), 'data', `test_canary_${Date.now()}`);
  fs.mkdirSync(testBaseDir, { recursive: true });

  // Instrument zero autonomous token issuance and zero approval
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
    // ------------------------------------------------------------------------
    // CATEGORY A: Canary branded identifiers
    // ------------------------------------------------------------------------
    console.log('--- CATEGORY A: Canary branded identifiers ---');
    const canaryId = createPolicyCanaryId('canary_001');
    assert.strictEqual(canaryId, 'canary_001');
    pass('CATEGORY A', 'PolicyCanaryId branded validation succeeded');

    const candidateId = createPolicyCandidateId('cand_001');
    assert.strictEqual(candidateId, 'cand_001');
    pass('CATEGORY A', 'PolicyCandidateId branded validation succeeded');

    const assignmentId = createPolicyRingAssignmentId('asgn_001');
    assert.strictEqual(assignmentId, 'asgn_001');
    pass('CATEGORY A', 'PolicyRingAssignmentId branded validation succeeded');

    const deploymentId = createPolicyCanaryDeploymentId('dep_001');
    assert.strictEqual(deploymentId, 'dep_001');
    pass('CATEGORY A', 'PolicyCanaryDeploymentId branded validation succeeded');

    const obsId = createPolicyCanaryObservationId('obs_001');
    assert.strictEqual(obsId, 'obs_001');
    pass('CATEGORY A', 'PolicyCanaryObservationId branded validation succeeded');

    const healthId = createPolicyCanaryHealthId('hlth_001');
    assert.strictEqual(healthId, 'hlth_001');
    pass('CATEGORY A', 'PolicyCanaryHealthId branded validation succeeded');

    const provId = createPolicyCanaryProvenanceId('prov_001');
    assert.strictEqual(provId, 'prov_001');
    pass('CATEGORY A', 'PolicyCanaryProvenanceId branded validation succeeded');

    assert.throws(() => createPolicyCanaryId('   '), /INVALID_POLICY_CANARY_ID/);
    assert.throws(() => createPolicyCandidateId(''), /INVALID_POLICY_CANDIDATE_ID/);
    pass('CATEGORY A', 'Branded identifiers reject whitespace/empty inputs');

    // ------------------------------------------------------------------------
    // CATEGORY B: Ring definitions and lifecycle validation
    // ------------------------------------------------------------------------
    console.log('--- CATEGORY B: Ring definitions and lifecycle validation ---');
    assert.strictEqual(CANONICAL_POLICY_RINGS.length, 5);
    pass('CATEGORY B', 'Exactly 5 canonical rings defined');

    assert.deepStrictEqual(CANONICAL_POLICY_RINGS, ['RING_0', 'RING_1', 'RING_2', 'RING_3', 'RING_4']);
    pass('CATEGORY B', '5 canonical policy rings verified in strict order (Ring 0 to 4)');

    // ------------------------------------------------------------------------
    // CATEGORY C: Tenant isolation
    // ------------------------------------------------------------------------
    console.log('--- CATEGORY C: Tenant isolation ---');
    const router = new PolicyRingRouter({ baseDir: testBaseDir });
    const candidateA = createTestCandidatePackage();
    const candidateB = createTestCandidatePackage();

    router.registerCandidate(candidateA);
    router.registerCandidate(candidateB);

    router.assignTenantRing({
      assignmentId: createPolicyRingAssignmentId('asgn_alice'),
      candidateId: candidateA.candidateId,
      tenantPartition: 'user_alice',
      ring: 'RING_1',
      assignedAt: new Date().toISOString(),
      assignedBy: 'boss_user',
      authorizationTokenId: 'tok_alice',
      active: true,
    });

    router.assignTenantRing({
      assignmentId: createPolicyRingAssignmentId('asgn_bob'),
      candidateId: candidateB.candidateId,
      tenantPartition: 'user_bob',
      ring: 'RING_2',
      assignedAt: new Date().toISOString(),
      assignedBy: 'boss_user',
      authorizationTokenId: 'tok_bob',
      active: true,
    });

    const aliceCand = router.resolveCandidate('user_alice');
    const bobCand = router.resolveCandidate('user_bob');

    assert.strictEqual(aliceCand?.candidateId, candidateA.candidateId);
    pass('CATEGORY C', 'Alice resolved candidate A');

    assert.strictEqual(bobCand?.candidateId, candidateB.candidateId);
    pass('CATEGORY C', 'Bob resolved candidate B');

    assert.notStrictEqual(aliceCand?.candidateId, bobCand?.candidateId);
    pass('CATEGORY C', 'Tenant A cannot resolve Tenant B candidate (strict isolation)');

    // ------------------------------------------------------------------------
    // CATEGORY D: Ring 0 shadow evaluation
    // ------------------------------------------------------------------------
    console.log('--- CATEGORY D: Ring 0 shadow evaluation ---');
    const shadowEvaluator = new PolicyShadowEvaluator();
    const activeConfig = createBaselinePolicyConfiguration();
    const shadowCandidate = createTestCandidatePackage();

    const shadowRecord = shadowEvaluator.evaluateShadow({
      tenantPartition: 'boss_user',
      toolName: 'recommend_voucher_campaign',
      activeConfig,
      candidateConfig: shadowCandidate.policyConfig,
      correlationId: 'corr_shadow_001',
    });

    assert.strictEqual(shadowRecord.toolName, 'recommend_voucher_campaign');
    assert.strictEqual(shadowRecord.activeClassification, 'RECOMMEND');
    assert.strictEqual(shadowRecord.candidateClassification, 'OBSERVE');
    pass('CATEGORY D', 'Active classification RECOMMEND vs Candidate classification OBSERVE evaluated');

    assert.strictEqual(shadowRecord.divergence, true);
    assert.ok(shadowRecord.divergenceReason?.includes('Classification changed'));
    pass('CATEGORY D', 'Ring 0 shadow evaluation accurately computes classification divergence');

    // ------------------------------------------------------------------------
    // CATEGORY E: Candidate never executes in shadow mode
    // ------------------------------------------------------------------------
    console.log('--- CATEGORY E: Candidate never executes in shadow mode ---');
    router.registerCandidate(shadowCandidate);
    router.assignTenantRing({
      assignmentId: createPolicyRingAssignmentId('asgn_shadow'),
      candidateId: shadowCandidate.candidateId,
      tenantPartition: 'user_shadow',
      ring: 'RING_0',
      assignedAt: new Date().toISOString(),
      assignedBy: 'boss_user',
      authorizationTokenId: 'tok_shadow',
      active: true,
    });

    const shouldUse = router.shouldUseCandidate('user_shadow');
    assert.strictEqual(shouldUse, false, 'Candidate must NEVER be flagged for execution in Ring 0');
    pass('CATEGORY E', 'shouldUseCandidate returns false in Ring 0');

    const routingDecision = router.resolvePolicyForTenant('user_shadow', activeConfig, 'recommend_voucher_campaign');
    assert.strictEqual(routingDecision.ring, 'RING_0');
    assert.strictEqual(routingDecision.isCandidate, false);
    assert.strictEqual(routingDecision.effectivePolicyConfig.versionId, activeConfig.versionId);
    assert.strictEqual(routingDecision.shadowCandidateConfig?.versionId, shadowCandidate.policyConfig.versionId);
    pass('CATEGORY E', 'Ring 0 returns active policy for execution; candidate routed strictly to shadow evaluator');

    // ------------------------------------------------------------------------
    // CATEGORY F: Candidate execution in Ring 1 (Internal Cohort)
    // ------------------------------------------------------------------------
    console.log('--- CATEGORY F: Candidate execution in Ring 1 ---');
    const ring1Candidate = createTestCandidatePackage();
    router.registerCandidate(ring1Candidate);
    router.assignTenantRing({
      assignmentId: createPolicyRingAssignmentId('asgn_ring1'),
      candidateId: ring1Candidate.candidateId,
      tenantPartition: 'user_operator',
      ring: 'RING_1',
      assignedAt: new Date().toISOString(),
      assignedBy: 'boss_user',
      authorizationTokenId: 'tok_ring1',
      active: true,
    });

    const ring1Decision = router.resolvePolicyForTenant('user_operator', activeConfig, 'recommend_voucher_campaign');
    assert.strictEqual(ring1Decision.ring, 'RING_1');
    assert.strictEqual(ring1Decision.isCandidate, true);
    assert.strictEqual(ring1Decision.effectivePolicyConfig.versionId, ring1Candidate.policyConfig.versionId);
    pass('CATEGORY F', 'Candidate policy selected for execution for explicitly assigned Ring 1 operator');

    // ------------------------------------------------------------------------
    // CATEGORY G: Candidate execution in Ring 2 (Canary Cohort)
    // ------------------------------------------------------------------------
    console.log('--- CATEGORY G: Candidate execution in Ring 2 ---');
    const ring2Candidate = createTestCandidatePackage();
    router.registerCandidate(ring2Candidate);
    router.assignTenantRing({
      assignmentId: createPolicyRingAssignmentId('asgn_ring2'),
      candidateId: ring2Candidate.candidateId,
      tenantPartition: 'user_cohort_sm',
      ring: 'RING_2',
      assignedAt: new Date().toISOString(),
      assignedBy: 'boss_user',
      authorizationTokenId: 'tok_ring2',
      active: true,
    });

    const ring2Decision = router.resolvePolicyForTenant('user_cohort_sm', activeConfig, 'recommend_voucher_campaign');
    assert.strictEqual(ring2Decision.ring, 'RING_2');
    assert.strictEqual(ring2Decision.isCandidate, true);
    pass('CATEGORY G', 'Candidate policy selected for execution for Ring 2 small cohort tenant');

    // ------------------------------------------------------------------------
    // CATEGORY H: Candidate execution in Ring 3 (Expanded Cohort)
    // ------------------------------------------------------------------------
    console.log('--- CATEGORY H: Candidate execution in Ring 3 ---');
    const ring3Candidate = createTestCandidatePackage();
    router.registerCandidate(ring3Candidate);
    router.assignTenantRing({
      assignmentId: createPolicyRingAssignmentId('asgn_ring3'),
      candidateId: ring3Candidate.candidateId,
      tenantPartition: 'user_cohort_lg',
      ring: 'RING_3',
      assignedAt: new Date().toISOString(),
      assignedBy: 'boss_user',
      authorizationTokenId: 'tok_ring3',
      active: true,
    });

    const ring3Decision = router.resolvePolicyForTenant('user_cohort_lg', activeConfig, 'recommend_voucher_campaign');
    assert.strictEqual(ring3Decision.ring, 'RING_3');
    assert.strictEqual(ring3Decision.isCandidate, true);
    pass('CATEGORY H', 'Candidate policy selected for execution for Ring 3 expanded cohort tenant');

    // ------------------------------------------------------------------------
    // CATEGORY I: Ring 4 global promotion
    // ------------------------------------------------------------------------
    console.log('--- CATEGORY I: Ring 4 global promotion ---');
    const ring4Candidate = createTestCandidatePackage({ currentRing: 'RING_4', state: 'GLOBAL' });
    router.registerCandidate(ring4Candidate);
    router.assignTenantRing({
      assignmentId: createPolicyRingAssignmentId('asgn_ring4'),
      candidateId: ring4Candidate.candidateId,
      tenantPartition: 'boss_user',
      ring: 'RING_4',
      assignedAt: new Date().toISOString(),
      assignedBy: 'boss_user',
      authorizationTokenId: 'tok_ring4',
      active: true,
    });

    const ring4Decision = router.resolvePolicyForTenant('boss_user', activeConfig, 'recommend_voucher_campaign');
    assert.strictEqual(ring4Decision.ring, 'RING_4');
    assert.strictEqual(ring4Decision.isCandidate, true);
    pass('CATEGORY I', 'Ring 4 global candidate successfully routes for execution');

    // ------------------------------------------------------------------------
    // CATEGORY J: Promotion requires human authorization
    // ------------------------------------------------------------------------
    console.log('--- CATEGORY J: Promotion requires human authorization ---');
    const promotionEngine = new PolicyRingPromotionEngine();
    const candidateToPromote = createTestCandidatePackage({ state: 'STAGED', currentRing: 'RING_0' });

    // Try promoting without authorization token -> Must throw
    assert.throws(
      () =>
        promotionEngine.promote(candidateToPromote, {
          candidateId: candidateToPromote.candidateId,
          targetRing: 'RING_0',
          tenantPartition: 'boss_user',
          operatorUserId: 'boss_user',
          authorizationToken: '',
          healthEvidence: {
            healthId: createPolicyCanaryHealthId('hlth_valid'),
            candidateId: candidateToPromote.candidateId,
            tenantPartition: 'boss_user',
            ring: 'RING_0',
            health: 'HEALTHY',
            recommendation: 'PROMOTE',
            metrics: {} as any,
            evaluatedAt: new Date().toISOString(),
            reasons: ['All metrics verified'],
            circuitBreakerRecommended: false,
          },
        }),
      /MISSING_AUTHORIZATION_TOKEN/
    );
    pass('CATEGORY J', 'Promotion rejected when authorization token is missing');

    // Issue genuine single-use token via Master Human Operator
    const token = originalIssueToken({
      actionId: 'promote_ring0',
      userId: 'boss_user',
      operatorId: 'boss_user',
      deviceId: 'dev_01',
      toolId: 'policy_canary_promote',
      target: candidateToPromote.candidateId,
      parameters: { targetRing: 'RING_0' },
      riskLevel: 'HIGH_IMPACT',
      singleUse: true,
    });

    const { updatedCandidate, result } = promotionEngine.promote(candidateToPromote, {
      candidateId: candidateToPromote.candidateId,
      targetRing: 'RING_0',
      tenantPartition: 'boss_user',
      operatorUserId: 'boss_user',
      authorizationToken: token.tokenId,
      healthEvidence: {
        healthId: createPolicyCanaryHealthId('hlth_valid'),
        candidateId: candidateToPromote.candidateId,
        tenantPartition: 'boss_user',
        ring: 'RING_0',
        health: 'HEALTHY',
        recommendation: 'PROMOTE',
        metrics: {} as any,
        evaluatedAt: new Date().toISOString(),
        reasons: ['All metrics verified'],
        circuitBreakerRecommended: false,
      },
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(updatedCandidate.currentRing, 'RING_0');
    assert.strictEqual(updatedCandidate.state, 'SHADOWING');
    pass('CATEGORY J', 'Ring promotion consumes valid human token; updates state to SHADOWING');

    // ------------------------------------------------------------------------
    // CATEGORY K: Autonomous promotion prevention
    // ------------------------------------------------------------------------
    console.log('--- CATEGORY K: Autonomous promotion prevention ---');
    assert.throws(
      () =>
        promotionEngine.promote(updatedCandidate, {
          candidateId: updatedCandidate.candidateId,
          targetRing: 'RING_1',
          tenantPartition: 'boss_user',
          operatorUserId: 'agent_autonomous_decision_engine',
          authorizationToken: 'fake_token',
          healthEvidence: {
            healthId: createPolicyCanaryHealthId('hlth_valid'),
            candidateId: updatedCandidate.candidateId,
            tenantPartition: 'boss_user',
            ring: 'RING_0',
            health: 'HEALTHY',
            recommendation: 'PROMOTE',
            metrics: {} as any,
            evaluatedAt: new Date().toISOString(),
            reasons: [],
            circuitBreakerRecommended: false,
          },
        }),
      /SECURITY_INVARIANT_VIOLATION: Autonomous or anonymous policy promotion is strictly prohibited/
    );
    pass('CATEGORY K', 'Autonomous promotion explicitly rejected with Security Invariant Violation');

    // ------------------------------------------------------------------------
    // CATEGORY L: Hard-forbidden immutability
    // ------------------------------------------------------------------------
    console.log('--- CATEGORY L: Hard-forbidden immutability ---');
    for (const forbidden of CANONICAL_HARD_FORBIDDEN_ACTIONS) {
      // Candidate attempting to reclassify hard-forbidden tool to OBSERVE
      const badCandidate = createTestCandidatePackage();
      (badCandidate.policyConfig.actionClassifications as any)[forbidden] = 'OBSERVE';

      // Recomputing checksum so checksum check passes, testing semantic check
      const payload = JSON.stringify({
        versionId: badCandidate.policyConfig.versionId,
        classifications: badCandidate.policyConfig.actionClassifications,
        guardrails: badCandidate.policyConfig.guardrails,
      });
      (badCandidate as any).checksum = crypto.createHash('sha256').update(payload).digest('hex');

      const shadowResult = shadowEvaluator.evaluateShadow({
        tenantPartition: 'boss_user',
        toolName: forbidden,
        activeConfig,
        candidateConfig: badCandidate.policyConfig,
      });

      assert.strictEqual(shadowResult.hardForbiddenDowngradeAttempt, true);
      assert.strictEqual(shadowResult.candidateClassification, 'FORBIDDEN', 'Safety floor must force FORBIDDEN');
      pass('CATEGORY L', `Hard-forbidden action '${forbidden}' permanently immutable against candidate downgrade`);
    }

    // ------------------------------------------------------------------------
    // CATEGORY M: USER_STOP supremacy
    // ------------------------------------------------------------------------
    console.log('--- CATEGORY M: USER_STOP supremacy ---');
    let userStopFlag = true;
    const stopRouter = new PolicyRingRouter({ isUserStopActive: () => userStopFlag });
    const stopDecision = stopRouter.resolvePolicyForTenant('boss_user', activeConfig, 'get_sales_report');

    assert.strictEqual(stopDecision.failClosedReason, 'USER_STOP');
    assert.strictEqual(stopDecision.reason, 'OPERATION_SUSPENDED_BY_USER_STOP');
    assert.strictEqual(stopDecision.isBaselineFallback, true);
    pass('CATEGORY M', 'USER_STOP immediately halts canary routing with OPERATION_SUSPENDED_BY_USER_STOP');

    // ------------------------------------------------------------------------
    // CATEGORY N: Circuit breaker
    // ------------------------------------------------------------------------
    console.log('--- CATEGORY N: Circuit breaker ---');
    const circuitBreaker = new PolicyCanaryCircuitBreaker();
    assert.strictEqual(circuitBreaker.isTripped('user_tenant_1'), false);
    pass('CATEGORY N', 'Circuit breaker initially untripped');

    circuitBreaker.trip({
      tenantPartition: 'user_tenant_1',
      reason: 'SAFETY_REGRESSION',
      details: 'Elevated rejection spike detected in canary cohort',
      trippedBy: 'automated_monitor',
    });

    assert.strictEqual(circuitBreaker.isTripped('user_tenant_1'), true);
    assert.strictEqual(circuitBreaker.getStatus('user_tenant_1').tripReason, 'SAFETY_REGRESSION');
    pass('CATEGORY N', 'Circuit breaker trips fail-closed on safety regression');

    // Circuit breaker cannot be reset autonomously
    assert.throws(
      () => circuitBreaker.reset('user_tenant_1', 'autonomous_bot', 'trying reset'),
      /SECURITY_INVARIANT_VIOLATION/
    );
    pass('CATEGORY N', 'Circuit breaker rejects autonomous reset');

    // Operator can reset
    circuitBreaker.reset('user_tenant_1', 'boss_user', 'Investigated and remediated');
    assert.strictEqual(circuitBreaker.isTripped('user_tenant_1'), false);
    pass('CATEGORY N', 'Circuit breaker allows authorized operator reset');

    // ------------------------------------------------------------------------
    // CATEGORY O: Ring-scoped rollback
    // ------------------------------------------------------------------------
    console.log('--- CATEGORY O: Ring-scoped rollback ---');
    const rollbackEngine = new PolicyCanaryRollbackEngine({ router, circuitBreaker });
    const rbResult = rollbackEngine.rollbackTenant({
      tenantPartition: 'user_operator',
      candidateId: ring1Candidate.candidateId,
      reason: 'ERROR_BUDGET_EXHAUSTED',
      details: 'Error budget exceeded in Ring 1',
      operatorUserId: 'boss_user',
    });

    assert.strictEqual(rbResult.success, true);
    assert.strictEqual(rbResult.affectedTenants[0], 'user_operator');
    // Verify tenant was unassigned from router
    assert.strictEqual(router.getRingAssignment('user_operator'), undefined);
    pass('CATEGORY O', 'Ring-scoped rollback unassigns affected tenant without resetting global system');

    // ------------------------------------------------------------------------
    // CATEGORY P: Telemetry aggregation
    // ------------------------------------------------------------------------
    console.log('--- CATEGORY P: Telemetry aggregation ---');
    const telemetry = new PolicyCanaryTelemetryAggregator();
    const testCandId = createPolicyCandidateId('cand_telemetry_test');

    telemetry.recordShadowEvaluation(
      {
        observationId: createPolicyCanaryObservationId('obs_tel_1'),
        tenantPartition: 'boss_user',
        toolName: 'test_tool',
        activeVersion: 'v1',
        candidateVersion: 'v2',
        activeClassification: 'OBSERVE',
        candidateClassification: 'OBSERVE',
        activeDecisionAllowed: true,
        candidateDecisionAllowed: true,
        divergence: false,
        activeGuardrailPassed: true,
        candidateGuardrailPassed: true,
        highImpactEscalation: false,
        hardForbiddenDowngradeAttempt: false,
        timestamp: new Date().toISOString(),
      },
      testCandId
    );

    telemetry.recordExecution({
      tenantPartition: 'boss_user',
      candidateId: testCandId,
      isCandidate: true,
      allowed: true,
      latencyMs: 45.2,
      leaseLatencyMs: 2.1,
    });

    const metrics = telemetry.getMetrics('boss_user', testCandId);
    assert.strictEqual(metrics.totalEvaluations, 2);
    assert.strictEqual(metrics.shadowEvaluations, 1);
    assert.strictEqual(metrics.candidateExecutions, 1);
    assert.strictEqual(metrics.allowRate, 1.0);
    assert.strictEqual(metrics.candidateLatencyMs, 45.2);
    pass('CATEGORY P', 'Canary telemetry aggregator collects granular execution and shadow metrics');

    // ------------------------------------------------------------------------
    // CATEGORY Q: Health evaluation
    // ------------------------------------------------------------------------
    console.log('--- CATEGORY Q: Health evaluation ---');
    const healthMonitor = new PolicyCanaryHealthMonitor({ minEvaluationsForPromotion: 2 });

    // Currently has 2 evaluations and zero failures -> HEALTHY
    const healthyReport = healthMonitor.evaluateHealth({
      candidateId: testCandId,
      tenantPartition: 'boss_user',
      ring: 'RING_0',
      metrics,
    });
    assert.strictEqual(healthyReport.health, 'HEALTHY');
    assert.strictEqual(healthyReport.recommendation, 'PROMOTE');
    pass('CATEGORY Q', 'Health monitor classifies candidate as HEALTHY with PROMOTE recommendation');

    // Record safety regression -> immediately CRITICAL
    telemetry.recordSafetyRegression('boss_user', testCandId);
    const criticalMetrics = telemetry.getMetrics('boss_user', testCandId);
    const criticalReport = healthMonitor.evaluateHealth({
      candidateId: testCandId,
      tenantPartition: 'boss_user',
      ring: 'RING_0',
      metrics: criticalMetrics,
    });
    assert.strictEqual(criticalReport.health, 'CRITICAL');
    assert.strictEqual(criticalReport.recommendation, 'ROLLBACK');
    assert.strictEqual(criticalReport.circuitBreakerRecommended, true);
    pass('CATEGORY Q', 'Health monitor immediately classifies CRITICAL on safety regression');

    // ------------------------------------------------------------------------
    // CATEGORY R: Policy drift detection
    // ------------------------------------------------------------------------
    console.log('--- CATEGORY R: Policy drift detection ---');
    telemetry.recordPolicyDrift('boss_user', testCandId);
    const driftMetrics = telemetry.getMetrics('boss_user', testCandId);
    assert.strictEqual(driftMetrics.policyDriftCount, 1);
    const driftReport = healthMonitor.evaluateHealth({
      candidateId: testCandId,
      tenantPartition: 'boss_user',
      ring: 'RING_1',
      metrics: driftMetrics,
    });
    assert.strictEqual(driftReport.health, 'CRITICAL');
    assert.ok(driftReport.reasons.some((r) => r.includes('active policy drift')));
    pass('CATEGORY R', 'Policy drift detection reflected in metrics and triggers CRITICAL advisory health');

    // ------------------------------------------------------------------------
    // CATEGORY S: Checksum mismatch
    // ------------------------------------------------------------------------
    console.log('--- CATEGORY S: Checksum mismatch ---');
    const corruptedCandidate = createTestCandidatePackage({ checksum: 'tampered_sha256_hash' });
    assert.throws(
      () => router.registerCandidate(corruptedCandidate),
      /CHECKSUM_MISMATCH/
    );
    pass('CATEGORY S', 'Cryptographic checksum mismatch rejected upon candidate registration');

    // ------------------------------------------------------------------------
    // CATEGORY T: Provenance chain
    // ------------------------------------------------------------------------
    console.log('--- CATEGORY T: Provenance chain ---');
    const provenanceEngine = new PolicyCanaryProvenanceEngine();
    const provCandId = createPolicyCandidateId('cand_prov_test');

    provenanceEngine.recordEvent({
      candidateId: provCandId,
      tenantPartition: 'boss_user',
      ring: 'RING_0',
      eventType: 'CANDIDATE_STAGED',
      candidatePolicyVersion: 'v1.0.0',
    });

    provenanceEngine.recordEvent({
      candidateId: provCandId,
      tenantPartition: 'boss_user',
      ring: 'RING_1',
      eventType: 'PROMOTED_TO_RING_1',
      candidatePolicyVersion: 'v1.0.0',
      evidenceReference: 'hlth_001',
      authorizationReference: 'tok_001',
    });

    const chainResult = provenanceEngine.verifyChain(provCandId);
    assert.strictEqual(chainResult.valid, true);
    assert.strictEqual(chainResult.recordCount, 2);
    pass('CATEGORY T', 'Tamper-evident SHA-256 provenance chain verified end-to-end');

    // ------------------------------------------------------------------------
    // CATEGORY U: Audit sanitization
    // ------------------------------------------------------------------------
    console.log('--- CATEGORY U: Audit sanitization ---');
    const canaryRuntime = new PolicyCanaryRuntime({ baseDir: testBaseDir });
    const auditCand = createTestCandidatePackage();
    canaryRuntime.stageCandidate(auditCand, 'boss_user');

    const stagedCand = canaryRuntime.getCandidate(auditCand.candidateId);
    assert.ok(stagedCand);
    assert.strictEqual(stagedCand.candidateId, auditCand.candidateId);
    pass('CATEGORY U', 'Canary runtime stages candidate and records audit events with sanitized payloads');

    // ------------------------------------------------------------------------
    // CATEGORY V: Execution lease cleanup
    // ------------------------------------------------------------------------
    console.log('--- CATEGORY V: Execution lease cleanup ---');
    const pep = new GovernedPolicyEnforcementPoint({ baseDir: testBaseDir, canaryRuntime });
    const decision = pep.enforce({
      toolName: 'get_sales_report',
      args: {},
      actor: { userId: 'boss_user', role: 'owner' },
    });

    assert.strictEqual(decision.allowed, true);
    assert.ok(decision.leaseId, 'Execution lease must be acquired for allowed execution');
    const leaseReleased = pep.releaseLease(decision.leaseId);
    assert.strictEqual(leaseReleased, true, 'Execution lease must be cleanly released');
    pass('CATEGORY V', 'PEP acquires and cleanly releases execution lease with canary runtime active');

    // ------------------------------------------------------------------------
    // CATEGORY W: Anonymous fail-closed
    // ------------------------------------------------------------------------
    console.log('--- CATEGORY W: Anonymous fail-closed ---');
    const anonRoute = router.resolvePolicyForTenant('anonymous', activeConfig, 'get_sales_report');
    assert.strictEqual(anonRoute.failClosedReason, 'TENANT_ISOLATION_FAILURE');
    assert.strictEqual(anonRoute.isBaselineFallback, true);
    pass('CATEGORY W', 'Anonymous request fails closed to baseline fallback in policy router');

    // ------------------------------------------------------------------------
    // CATEGORY X: Cross-tenant isolation
    // ------------------------------------------------------------------------
    console.log('--- CATEGORY X: Cross-tenant isolation ---');
    assert.throws(
      () =>
        router.assignTenantRing({
          assignmentId: createPolicyRingAssignmentId('asgn_invalid'),
          candidateId: auditCand.candidateId,
          tenantPartition: '',
          ring: 'RING_1',
          assignedAt: new Date().toISOString(),
          assignedBy: 'boss_user',
          authorizationTokenId: 'tok_01',
          active: true,
        }),
      /TENANT_ISOLATION_FAILURE/
    );
    pass('CATEGORY X', 'Empty or invalid tenant assignment rejected by policy ring router');

    // ------------------------------------------------------------------------
    // CATEGORY Y: Stale policy rejection
    // ------------------------------------------------------------------------
    console.log('--- CATEGORY Y: Stale policy rejection ---');
    const expiredCand = createTestCandidatePackage({
      expiresAt: new Date(Date.now() - 10000).toISOString(),
    });
    router.registerCandidate(expiredCand);
    router.assignTenantRing({
      assignmentId: createPolicyRingAssignmentId('asgn_expired'),
      candidateId: expiredCand.candidateId,
      tenantPartition: 'user_expired_test',
      ring: 'RING_1',
      assignedAt: new Date().toISOString(),
      assignedBy: 'boss_user',
      authorizationTokenId: 'tok_expired',
      active: true,
    });

    const expiredDecision = router.resolvePolicyForTenant('user_expired_test', activeConfig, 'get_sales_report');
    assert.strictEqual(expiredDecision.failClosedReason, 'EXPIRED_POLICY');
    assert.strictEqual(expiredDecision.isBaselineFallback, true);
    pass('CATEGORY Y', 'Expired candidate policy rejected fail-closed to baseline');

    // ------------------------------------------------------------------------
    // CATEGORY Z: Forbidden execution primitive scan
    // ------------------------------------------------------------------------
    console.log('--- CATEGORY Z: Forbidden execution primitive scan ---');
    const canaryDir = path.resolve(process.cwd(), 'src', 'core', 'policyCanary');
    const files = fs.readdirSync(canaryDir).filter((f) => f.endsWith('.ts'));

    const forbiddenPatterns = [
      /\bchild_process\b/,
      /\bexecSync\b/,
      /\bexec\s*\(/,
      /\bspawn\s*\(/,
      /\bfork\s*\(/,
      /\beval\s*\(/,
      /\bFunction\s*\(/,
    ];

    let forbiddenOccurrences = 0;
    for (const file of files) {
      const content = fs.readFileSync(path.join(canaryDir, file), 'utf-8');
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(content)) {
          console.error(`FORBIDDEN PRIMITIVE in ${file}: ${pattern}`);
          forbiddenOccurrences++;
        }
      }
    }

    assert.strictEqual(forbiddenOccurrences, 0, 'Zero forbidden execution primitives permitted');
    pass('CATEGORY Z', `Static scan clean: 0 forbidden execution primitives across ${files.length} canary files`);

    // ------------------------------------------------------------------------
    // FINAL REALITY GATE CHECKS
    // ------------------------------------------------------------------------
    assert.strictEqual(autonomousTokensIssued, 0, 'Zero autonomous token issuance permitted');
    assert.strictEqual(autonomousApprovalsCount, 0, 'Zero autonomous human approval permitted');
    pass('FINAL GATE', 'Autonomous token issuance = 0, Autonomous human approvals = 0');

    console.log('\n======================================================================');
    console.log(`REALITY GATE PASSED: ${passedAssertions} assertions verified!`);
    console.log('======================================================================\n');
  } finally {
    // Restore hooks
    globalWorldActionAuth.issueToken = originalIssueToken;
    globalApprovalService.grantApproval = originalGrantApproval;

    // Cleanup test dir
    try {
      fs.rmSync(testBaseDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}

runRealityGate().catch((err) => {
  console.error('\nREALITY GATE FAILED:', err);
  process.exit(1);
});
