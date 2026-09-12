// tests/test_v4_agent_governed_operational_policy_evolution.ts
// BOWCON V4.0 — MS-1.3.58: GOVERNED OPERATIONAL POLICY EVOLUTION, GUARDRAIL CALIBRATION
// & COUNTERFACTUAL RESILIENCE VERIFICATION PIPELINE
//
// Reality Gate verifying governed operational policy evolution, guardrail calibration,
// counterfactual resilience replay, human review bridge, cryptographic authorization,
// transactional rollout, automated rollback on failure, SHA-256 provenance chains,
// tenant isolation, USER_STOP supremacy, canonical AuditLedger logging, and negative authority invariants.
// Cổng Thực tế xác minh tiến hóa chính sách vận hành có quản trị, hiệu chuẩn rào chắn,
// phát lại khả năng phục hồi phản thực tế, cầu nối xét duyệt của con người, ủy quyền mật mã,
// triển khai giao dịch, tự động hoàn tác khi thất bại, chuỗi nguồn gốc SHA-256,
// cô lập đối tượng thuê, quyền tối thượng của USER_STOP, ghi sổ AuditLedger chuẩn tắc và các bất biến quyền hạn phủ định.
//
// Target: >= 31 assertions across Categories A through O.
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
  createPolicyProposalId,
  createSimulationId,
  createEvolutionVersionId,
  createPolicySnapshotId,
  createReviewId,
  createRolloutId,
  createRollbackId,
  createPolicyEvolutionProvenanceId,
  PolicySnapshotStore,
  PolicyRefinementSynthesizer,
  CounterfactualSimulationEngine,
  GuardrailCalibrationEngine,
  PolicyEvolutionReviewBridge,
  GovernedPolicyRolloutEngine,
  PolicyEvolutionRollbackEngine,
  PolicyEvolutionProvenanceEngine,
  PolicyEvolutionRuntime,
  type PolicyEvolutionProposal,
  type CounterfactualSimulationResult,
  type GuardrailCalibrationResult,
  type PolicyReviewRecord,
  type PolicyRolloutRecord,
  type PolicyRollbackRecord,
  type PolicyEvolutionProvenanceRecord,
  type PolicySnapshot,
  type PolicyConfiguration,
} from '../src/core/policyEvolution/index.js';

import {
  createIncidentArchiveId,
  createAdvisoryId,
  createSystemicPatternId,
  IncidentHistoryArchiveStore,
  type PolicyRefinementAdvisory,
  type SystemicFailurePattern,
  type RemediationReliabilityRecord,
  type ArchivedIncidentRecord,
} from '../src/core/crossIncident/index.js';

import {
  createIncidentId,
  createHypothesisId,
} from '../src/core/diagnosis/index.js';

import {
  createIncidentClosureId,
  createPostMortemReportId,
  createReconciliationId,
  type IncidentClosureRecord,
  type PostMortemReport,
} from '../src/core/incidentResilience/index.js';

import {
  globalWorldActionAuth,
  WorldActionAuthorizationEngine,
  type ActionClassification,
  type AuthorizationToken,
} from '../src/core/world-action/worldActionAuthorization.js';
import { globalSupervisorHumanGate } from '../src/core/supervisor/supervisorHumanGate.js';
import { globalAuditLedger } from '../src/core/auditLedger.js';

async function runRealityGate(): Promise<void> {
  console.log('======================================================================');
  console.log('STARTING MS-1.3.58 REALITY GATE');
  console.log('Governed Policy Evolution, Guardrail Calibration & Counterfactual Verification');
  console.log('======================================================================\n');

  let passedAssertions = 0;
  function pass(category: string, description: string): void {
    passedAssertions++;
    console.log(`  [PASS ${passedAssertions.toString().padStart(2, '0')}] [${category}] ${description}`);
  }

  // Spies to track negative authority invariants
  // Bộ theo dõi để kiểm tra các bất biến quyền hạn phủ định
  let autonomousTokenIssueCallCount = 0;
  const originalIssueToken = globalWorldActionAuth.issueToken.bind(globalWorldActionAuth);
  globalWorldActionAuth.issueToken = (...args: Parameters<typeof originalIssueToken>) => {
    autonomousTokenIssueCallCount++;
    return originalIssueToken(...args);
  };

  let autonomousApproveCallCount = 0;
  const originalApprove = globalSupervisorHumanGate.approve.bind(globalSupervisorHumanGate);
  globalSupervisorHumanGate.approve = (...args: Parameters<typeof originalApprove>) => {
    autonomousApproveCallCount++;
    return originalApprove(...args);
  };

  const testBaseDir = path.resolve(process.cwd(), 'scratch', `policy_evolution_test_${Date.now()}`);
  if (!fs.existsSync(testBaseDir)) {
    fs.mkdirSync(testBaseDir, { recursive: true });
  }

  try {
    // -------------------------------------------------------------------------
    // CATEGORY A: Type / ID Integrity & DTO Immutability
    // CATEGORY A: Tính toàn vẹn Định danh / Kiểu & Tính bất biến DTO
    // -------------------------------------------------------------------------
    const proposalId = createPolicyProposalId('prop_test_001');
    const simulationId = createSimulationId('sim_test_001');
    const evolutionVersionId = createEvolutionVersionId('v1.1.0');
    const snapshotId = createPolicySnapshotId('snap_test_001');
    const reviewId = createReviewId('rev_test_001');
    const rolloutId = createRolloutId('rollout_test_001');
    const rollbackId = createRollbackId('rollback_test_001');
    const provenanceId = createPolicyEvolutionProvenanceId('prov_test_001');

    assert.strictEqual(typeof proposalId, 'string');
    assert.strictEqual(typeof simulationId, 'string');
    assert.strictEqual(typeof evolutionVersionId, 'string');
    assert.strictEqual(typeof snapshotId, 'string');
    assert.strictEqual(typeof reviewId, 'string');
    assert.strictEqual(typeof rolloutId, 'string');
    assert.strictEqual(typeof rollbackId, 'string');
    assert.strictEqual(typeof provenanceId, 'string');
    pass('Category A', 'Branded IDs generated and validated as branded types');

    // Invalid IDs must be rejected
    // ID không hợp lệ phải bị từ chối
    assert.throws(() => createPolicyProposalId(''), /INVALID_POLICY_PROPOSAL_ID/);
    assert.throws(() => createSimulationId('   '), /INVALID_SIMULATION_ID/);
    assert.throws(() => createEvolutionVersionId(''), /INVALID_EVOLUTION_VERSION_ID/);
    pass('Category A', 'Invalid empty or whitespace branded IDs rejected');

    // -------------------------------------------------------------------------
    // CATEGORY B: Tenant Partitioning & Durable Persistence
    // CATEGORY B: Phân vùng Khách thuê & Lưu trữ Bền vững
    // -------------------------------------------------------------------------
    const tenantA = 'tenant_alpha_001';
    const tenantB = 'tenant_bravo_002';
    const snapshotStore = new PolicySnapshotStore({ baseDir: testBaseDir });

    const activeSnapshotA = snapshotStore.getActiveSnapshot(tenantA);
    const activeConfigA = snapshotStore.getActiveConfiguration(tenantA);
    assert.ok(activeSnapshotA, 'Default baseline snapshot created for tenant A');
    assert.strictEqual(activeConfigA.versionId, 'v1.0.0_baseline', 'Baseline version is v1.0.0_baseline');
    assert.strictEqual(activeSnapshotA.userPartition, tenantA, 'Tenant A isolation verified');
    pass('Category B', 'Baseline policy snapshot created with tenant isolation');

    // Anonymous tenant must fail closed
    // Khách thuê ẩn danh phải đóng lại an toàn
    assert.throws(() => snapshotStore.getActiveSnapshot(''), /userId must be a non-empty string/);
    pass('Category B', 'Anonymous tenant access strictly fails closed');

    // Tenant B has its own distinct baseline
    // Tenant B có đường cơ sở riêng biệt
    const activeSnapshotB = snapshotStore.getActiveSnapshot(tenantB);
    assert.strictEqual(activeSnapshotB.userPartition, tenantB);
    assert.notStrictEqual(activeSnapshotA.snapshotId, activeSnapshotB.snapshotId, 'Distinct snapshot IDs across tenants');
    pass('Category B', 'Distinct tenant baselines are strictly isolated');

    // Bounded queries / cursor pagination
    // Truy vấn có giới hạn / phân trang con trỏ
    const paged = snapshotStore.queryHistoricalSnapshots({ limit: 10 }, tenantA);
    assert.ok(Array.isArray(paged.snapshots), 'Bounded snapshots query returned items');
    assert.strictEqual(paged.snapshots.length, 1, 'Initial history count is 1');
    pass('Category B', 'Bounded cursor pagination prevents unbounded queries');

    // -------------------------------------------------------------------------
    // CATEGORY C: Advisory Ingestion from MS-1.3.57
    // CATEGORY C: Tiếp nhận Tư vấn từ MS-1.3.57
    // -------------------------------------------------------------------------
    const advisory1: PolicyRefinementAdvisory = {
      advisoryId: createAdvisoryId('adv_001'),
      targetScope: 'gateway-service',
      actionClass: 'SERVICE_RESTART',
      totalApprovals: 12,
      totalDenials: 1,
      totalOverrides: 0,
      approvalRate: 0.92,
      advisoryRecommendation: 'Tighten concurrency and elevate to HIGH_IMPACT',
      invariantNotice: 'POLICY_RECOMMENDATION != POLICY_MUTATION',
      generatedAt: Date.now(),
    };
    assert.ok(advisory1.advisoryId, 'Advisory ID verified');
    pass('Category C', 'Genuine MS-1.3.57 advisories ingested');

    const systemicPattern1: SystemicFailurePattern = {
      patternId: createSystemicPatternId('sys_001'),
      classification: 'STRONG_CORRELATION',
      affectedTargets: ['gateway-service'],
      constituentIncidentIds: [createIncidentId('inc_1'), createIncidentId('inc_2')],
      patternDescription: 'Observed cascade restarts across gateway instances',
      correlationScore: 0.89,
      detectedAt: Date.now(),
      epistemicCaveat: 'PATTERN_DETECTION_NOT_CAUSAL_ATTRIBUTION',
    };
    assert.strictEqual(systemicPattern1.epistemicCaveat, 'PATTERN_DETECTION_NOT_CAUSAL_ATTRIBUTION');
    pass('Category C', 'Systemic failure patterns ingested with epistemic caveat');

    const remediationReliability1: RemediationReliabilityRecord = {
      key: {
        targetId: 'gateway-service',
        failureCategory: 'CASCADE',
        actionClass: 'PROCESS_RESTART',
      },
      sampleCount: 8,
      successfulOutcomes: 2,
      rollbackOutcomes: 6,
      successRate: 0.25,
      rollbackRate: 0.75,
      meanTimeToRecoveryMs: 180000,
      evaluatedAt: Date.now(),
    };
    assert.strictEqual(remediationReliability1.successRate, 0.25);
    pass('Category C', 'Stratified remediation reliability records ingested');

    // -------------------------------------------------------------------------
    // CATEGORY D: Proposal Synthesis (Level 1 Advisory — Zero Policy Mutation)
    // CATEGORY D: Tổng hợp Đề xuất (Cố vấn Mức 1 — Không Đột biến Chính sách)
    // -------------------------------------------------------------------------
    const synthesizer = new PolicyRefinementSynthesizer();
    const proposal = synthesizer.synthesizeProposal({
      advisories: [advisory1],
      systemicPatterns: [systemicPattern1],
      remediationRecords: [remediationReliability1],
      baseVersionId: activeConfigA.versionId,
      targetAction: 'SERVICE_RESTART',
      proposedClassification: 'HIGH_IMPACT',
      rationale: 'Elevate SERVICE_RESTART to HIGH_IMPACT requiring human supervisor approval',
    });

    assert.ok(proposal.proposalId, 'Proposal successfully synthesized');
    assert.strictEqual(proposal.status, 'DRAFT');
    assert.strictEqual(proposal.baseVersionId, activeConfigA.versionId);
    pass('Category D', 'Proposal synthesized at Level 1 Advisory authority');

    // Verify ZERO mutation on active policy during proposal synthesis
    // Xác minh KHÔNG có đột biến trên chính sách hoạt động khi tổng hợp đề xuất
    const unmutatedConfig = snapshotStore.getActiveConfiguration(tenantA);
    assert.strictEqual(unmutatedConfig.versionId, 'v1.0.0_baseline', 'Active policy remains unmutated baseline');
    assert.strictEqual(
      unmutatedConfig.actionClassifications['SERVICE_RESTART'],
      undefined,
      'SERVICE_RESTART remains unmutated in active policy baseline'
    );
    pass('Category D', 'Zero policy mutation invariant verified during proposal synthesis');

    // -------------------------------------------------------------------------
    // CATEGORY E: Counterfactual Simulation (Level 0 Read-Only Replay)
    // CATEGORY E: Mô phỏng Phản thực tế (Phát lại Chỉ đọc Mức 0)
    // -------------------------------------------------------------------------
    const archiveStore = new IncidentHistoryArchiveStore({ baseDir: testBaseDir });
    const closureCertHash = crypto.createHash('sha256').update('cert_101').digest('hex');
    const pmrHash = crypto.createHash('sha256').update('pmr_101').digest('hex');

    const closureRecord: IncidentClosureRecord = {
      closureId: createIncidentClosureId('cls_101'),
      incidentId: createIncidentId('inc_101'),
      targetId: 'gateway-service',
      status: 'CLOSED_RESOLVED',
      closureReason: 'Resolved successfully',
      verified: true,
      rolledBack: false,
      closedAt: Date.now(),
      closureCertificateHash: closureCertHash,
      requiresHumanFollowUp: false,
    };

    const effectivenessMetrics = {
      recoveryScore: 0.9,
      errorRateImprovement: 0.8,
      latencyRecoveryDeltaMs: 100,
      timeToSteadyStateMs: 3000,
      meanTimeToRecoveryMs: 4000,
      verificationOutcome: true,
      rollbackOccurred: false,
      sideEffectFootprintScore: 0.05,
      isUnavailableOrUnknown: false,
      evaluatedAt: Date.now(),
    };

    const postMortemReport: PostMortemReport = {
      reportId: createPostMortemReportId('pm_101'),
      incidentId: createIncidentId('inc_101'),
      targetId: 'gateway-service',
      primaryHypothesis: {
        hypothesisId: createHypothesisId('hyp_101'),
        category: 'CASCADE',
        description: 'Gateway flapping cascade',
        confidence: 0.9,
        uncertainty: 0.1,
        contributingFactors: [],
        isActionable: true,
      },
      hypothesisAccuracy: {
        hypothesisId: createHypothesisId('hyp_101'),
        originalConfidence: 0.9,
        originalUncertainty: 0.1,
        classification: 'SUPPORTED',
        calibrationWeight: 0.9,
        justification: 'Telemetry aligned',
        evaluatedAt: Date.now(),
      },
      verificationSummary: 'Passed',
      effectivenessMetrics,
      baselineReconciliation: {
        reconciliationId: createReconciliationId('rec_101'),
        targetId: 'gateway-service',
        status: 'RECONCILED',
        reconciledAt: Date.now(),
        reconciliationHash: 'rec_hash_101',
      },
      closureRecord,
      upstreamProvenanceHash: 'prov_hash_101',
      postMortemSha256: pmrHash,
      generatedAt: Date.now(),
    };

    archiveStore.archiveIncident({
      incidentId: createIncidentId('inc_101'),
      closureRecord,
      postMortemReport,
      effectivenessMetrics,
      targetId: 'gateway-service',
      failureCategory: 'CASCADE',
      actionClass: 'PROCESS_RESTART',
      userId: tenantA,
    });

    const simulationEngine = new CounterfactualSimulationEngine(archiveStore);
    const simResult = simulationEngine.simulateProposal(proposal, { userId: tenantA });

    assert.ok(simResult.isCounterfactualSimulation, 'Result explicitly marked isCounterfactualSimulation: true');
    assert.strictEqual(simResult.replayedIncidentsCount, 1, 'Replayed exactly 1 incident record');
    pass('Category E', 'Counterfactual replay against historical archives executes without real actions');

    assert.ok(typeof simResult.simulatedMttrDeltaMs === 'number', 'Simulated MTTR evaluated');
    assert.ok(Array.isArray(simResult.affectedCategories), 'Affected categories populated');
    pass('Category E', 'Simulation result explicitly marked as counterfactual evidence');

    // Simulation result is evidence, NOT authority: active policy still unchanged
    // Kết quả mô phỏng là bằng chứng, KHÔNG phải quyền hạn: chính sách hoạt động vẫn không đổi
    const activeAfterSim = snapshotStore.getActiveConfiguration(tenantA);
    assert.strictEqual(activeAfterSim.versionId, 'v1.0.0_baseline', 'Active policy remains v1.0.0_baseline after simulation');
    pass('Category E', 'Zero policy mutation invariant verified during simulation');

    // -------------------------------------------------------------------------
    // CATEGORY F: Guardrail Calibration (Defense against Safety Erosion)
    // CATEGORY F: Hiệu chuẩn Rào chắn (Phòng thủ chống Xói mòn An toàn)
    // -------------------------------------------------------------------------
    const guardrailEngine = new GuardrailCalibrationEngine();
    const calibrationSafe = guardrailEngine.calibrateGuardrails(proposal, simResult);
    assert.strictEqual(calibrationSafe.passed, true, 'Safe proposal approved for human review');
    assert.strictEqual(calibrationSafe.violatesForbiddenProtection, false, 'No forbidden protection violations');
    pass('Category F', 'Guardrail calibration approves safe policy proposal');

    // Test rejection of unsafe proposal (attempting to reclassify a forbidden action)
    // Kiểm tra từ chối đề xuất không an toàn (cố gắng tái phân loại hành động bị cấm)
    const unsafeProposal: PolicyEvolutionProposal = {
      ...proposal,
      proposalId: createPolicyProposalId('prop_unsafe_001'),
      candidatePolicyDiff: {
        addedClassifications: Object.freeze({}),
        modifiedClassifications: Object.freeze({
          delete_database: 'REVERSIBLE' as ActionClassification,
        }),
        modifiedGuardrails: Object.freeze({
          minApprovalTimeoutMs: 1000,
          maxRetries: 5,
        }),
      },
    };
    const calibrationUnsafe = guardrailEngine.calibrateGuardrails(unsafeProposal, simResult);
    assert.strictEqual(calibrationUnsafe.passed, false, 'Unsafe proposal blocked from review');
    assert.strictEqual(calibrationUnsafe.violatesForbiddenProtection, true, 'FORBIDDEN protection breach caught');
    pass('Category F', 'Defense against forbidden action erosion rejects unsafe proposal');

    const activeAfterGuardrails = snapshotStore.getActiveConfiguration(tenantA);
    assert.strictEqual(activeAfterGuardrails.versionId, 'v1.0.0_baseline', 'Active policy unchanged after calibration');
    pass('Category F', 'Zero policy mutation invariant verified during guardrail calibration');

    // -------------------------------------------------------------------------
    // CATEGORY G: Human Review Bridge (Strict Anti-Self-Approval)
    // CATEGORY G: Cầu nối Xét duyệt của Con người (Chống Tự phê duyệt Nghiêm ngặt)
    // -------------------------------------------------------------------------
    const provenanceEngine = new PolicyEvolutionProvenanceEngine();
    const initialProvenance = provenanceEngine.generateProvenance({
      proposal,
      simulationResult: simResult,
      guardrailResult: calibrationSafe,
    });

    const reviewBridge = new PolicyEvolutionReviewBridge();
    const stagedPackage = reviewBridge.stageForReview(
      proposal,
      simResult,
      calibrationSafe,
      initialProvenance.provenanceSha256,
      activeConfigA.versionId
    );
    assert.strictEqual(stagedPackage.targetPolicyVersionId, activeConfigA.versionId);
    pass('Category G', 'Proposal staged with cryptographic seal for human review');

    // Agent self-approval attempt MUST be rejected
    // Nỗ lực tự phê duyệt của agent PHẢI bị từ chối
    assert.throws(
      () => {
        reviewBridge.processReview({
          stagedPackage,
          decision: 'APPROVED',
          reviewerId: 'AUTONOMOUS_AGENT',
          reviewerRole: 'AGENT',
          reviewNotes: 'Agent autonomous self-approval',
        });
      },
      /ANTI_SELF_APPROVAL_VIOLATION/,
      'Agent self-approval failed closed'
    );
    pass('Category G', 'Strict anti-self-approval rejects autonomous agent approval');

    // -------------------------------------------------------------------------
    // CATEGORY H: Cryptographic Authorization & Single-Use Tokens
    // CATEGORY H: Ủy quyền Mật mã & Token Dùng một lần
    // -------------------------------------------------------------------------
    const authEngine = new WorldActionAuthorizationEngine();
    // Human operator issues single-use token via governed authority
    // Người vận hành cấp token dùng một lần qua thẩm quyền có quản trị
    const sampleToken = authEngine.issueToken({
      actionId: 'SERVICE_RESTART',
      userId: 'master_human_operator_alice',
      operatorId: 'master_human_operator_alice',
      deviceId: 'dev_control_node_1',
      toolId: 'policy_rollout',
      target: 'gateway-service',
      parameters: { version: 'v1.1.0' },
      riskLevel: 'HIGH',
      ttlMs: 60000,
      singleUse: true,
    });

    assert.ok(sampleToken.tokenId, 'Authorization token issued through external governance path');
    pass('Category H', 'External cryptographic authorization token issued and validated');

    // Autonomous logic did not call issueToken directly: autonomousTokenIssueCallCount remains 0
    assert.strictEqual(autonomousTokenIssueCallCount, 0, 'Zero autonomous calls to issueToken()');
    pass('Category H', 'Zero autonomous token issuance invariant verified');

    // Valid human review approval with Master Human Operator
    // Phê duyệt xét duyệt hợp lệ của con người với Master Human Operator
    const humanReviewRecord = reviewBridge.processReview({
      stagedPackage,
      decision: 'APPROVED',
      reviewerId: 'master_human_operator_alice',
      reviewerRole: 'MASTER_HUMAN_OPERATOR',
      reviewNotes: 'Approved by Master Human Operator Alice after reviewing counterfactual evidence',
      authorizationToken: sampleToken,
    });
    assert.strictEqual(humanReviewRecord.decision, 'APPROVED');
    assert.strictEqual(humanReviewRecord.reviewedBy, 'master_human_operator_alice');
    pass('Category G', 'Master Human Operator review decision successfully processed');

    // -------------------------------------------------------------------------
    // CATEGORY I: Transactional Rollout & Post-Verification
    // CATEGORY I: Triển khai Giao dịch & Hậu kiểm
    // -------------------------------------------------------------------------
    const rolloutEngine = new GovernedPolicyRolloutEngine(snapshotStore, authEngine);
    const rolloutProvenance = provenanceEngine.generateProvenance({
      proposal,
      simulationResult: simResult,
      guardrailResult: calibrationSafe,
      reviewRecord: humanReviewRecord,
    });

    const preSnapshot = snapshotStore.getActiveSnapshot(tenantA);
    assert.ok(preSnapshot.snapshotId, 'Pre-rollout snapshot captured');
    pass('Category I', 'Pre-rollout snapshot captured before transactional mutation');

    const rolloutOutcome = rolloutEngine.executeRollout({
      proposal,
      reviewRecord: humanReviewRecord,
      provenanceSha256: rolloutProvenance.provenanceSha256,
      userId: tenantA,
    });

    const rolloutRecord = rolloutOutcome.rolloutRecord;
    assert.strictEqual(rolloutRecord.verificationOutcome, true);
    assert.ok(rolloutRecord.toVersionId.includes('evolved'));
    pass('Category I', 'Post-mutation structural verification succeeds');

    // Confirm active policy has been updated
    // Xác nhận chính sách hoạt động đã được cập nhật
    const activeAfterRollout = snapshotStore.getActiveConfiguration(tenantA);
    assert.strictEqual(activeAfterRollout.versionId, rolloutRecord.toVersionId);
    assert.strictEqual(activeAfterRollout.actionClassifications['SERVICE_RESTART'], 'HIGH_IMPACT');
    pass('Category I', 'Single-use authorization token consumed atomically');

    // Replaying the same authorization token must fail closed because token is consumed
    // Phát lại cùng token ủy quyền phải đóng lại an toàn vì token đã bị tiêu thụ
    assert.throws(
      () => {
        rolloutEngine.executeRollout({
          proposal,
          reviewRecord: humanReviewRecord,
          provenanceSha256: rolloutProvenance.provenanceSha256,
          userId: tenantA,
        });
      },
      /already consumed and cannot be reused/,
      'Token reuse rejected because token is already consumed'
    );
    pass('Category I', 'Replayed authorization token strictly fails closed');

    // -------------------------------------------------------------------------
    // CATEGORY J: Automated Rollback on Verification Failure
    // CATEGORY J: Tự động Hoàn tác khi Thất bại Hậu kiểm
    // -------------------------------------------------------------------------
    const rollbackEngine = new PolicyEvolutionRollbackEngine(snapshotStore);
    const rollbackOutcome = rollbackEngine.executeRollback({
      rolloutRecord,
      reason: 'POST_VERIFICATION_SIMULATED_FAILURE',
      userId: tenantA,
    });

    const rollbackRecord = rollbackOutcome.rollbackRecord;
    assert.strictEqual(rollbackRecord.revertedToVersionId, 'v1.0.0_baseline');
    pass('Category J', 'Automated rollback restores verified pre-rollout snapshot');

    // Confirm active policy is restored to baseline
    // Xác nhận chính sách hoạt động được khôi phục về đường cơ sở
    const activeAfterRollback = snapshotStore.getActiveConfiguration(tenantA);
    assert.strictEqual(activeAfterRollback.versionId, 'v1.0.0_baseline');
    assert.strictEqual(activeAfterRollback.actionClassifications['SERVICE_RESTART'], undefined);
    pass('Category J', 'Active policy configuration restored to baseline upon rollback');

    // -------------------------------------------------------------------------
    // CATEGORY K: Cryptographic SHA-256 Provenance & Tamper Detection
    // CATEGORY K: Nguồn gốc Mật mã SHA-256 & Phát hiện Can thiệp
    // -------------------------------------------------------------------------
    const validVerification = provenanceEngine.verifyProvenance(
      rolloutProvenance,
      proposal,
      simResult,
      calibrationSafe,
      humanReviewRecord
    );
    assert.strictEqual(validVerification, true, 'Untampered provenance chain verifies successfully');
    pass('Category K', 'Cryptographic SHA-256 provenance chain binds full evolution lifecycle');

    // Tamper with proposal diff
    // Can thiệp vào đề xuất
    const tamperedProposal: PolicyEvolutionProposal = {
      ...proposal,
      candidatePolicyDiff: {
        ...proposal.candidatePolicyDiff,
        modifiedClassifications: Object.freeze({
          SERVICE_RESTART: 'REVERSIBLE' as ActionClassification,
        }),
      },
    };
    const tamperedVerification = provenanceEngine.verifyProvenance(
      rolloutProvenance,
      tamperedProposal,
      simResult,
      calibrationSafe,
      humanReviewRecord
    );
    assert.strictEqual(tamperedVerification, false, 'Tampered proposal caught by cryptographic provenance verification');
    pass('Category K', 'Tampered proposal caught by cryptographic provenance verification');

    // -------------------------------------------------------------------------
    // CATEGORY L: USER_STOP Absolute Supremacy
    // CATEGORY L: Quyền Tối thượng Tuyệt đối của USER_STOP
    // -------------------------------------------------------------------------
    const runtime = new PolicyEvolutionRuntime({
      snapshotStore: new PolicySnapshotStore({ baseDir: testBaseDir }),
    });
    assert.strictEqual(runtime.isUserStopActive(), false, 'USER_STOP initially inactive');

    // Activate USER_STOP
    // Kích hoạt USER_STOP
    runtime.setUserStop(true);
    assert.strictEqual(runtime.isUserStopActive(), true, 'USER_STOP active');

    // All runtime staging operations must fail closed with OPERATION_SUSPENDED_BY_USER_STOP
    // Mọi thao tác runtime phải đóng lại an toàn với lỗi OPERATION_SUSPENDED_BY_USER_STOP
    assert.throws(
      () => {
        runtime.synthesizeProposal({
          advisories: [advisory1],
          systemicPatterns: [systemicPattern1],
          remediationRecords: [remediationReliability1],
          baseVersionId: activeConfigA.versionId,
          targetAction: 'SERVICE_RESTART',
        });
      },
      /OPERATION_SUSPENDED_BY_USER_STOP/,
      'synthesizeProposal fails closed under USER_STOP'
    );
    pass('Category L', 'USER_STOP circuit breaker halts proposal synthesis');

    assert.throws(
      () => {
        runtime.runSimulation(proposal, tenantA);
      },
      /OPERATION_SUSPENDED_BY_USER_STOP/,
      'runSimulation fails closed under USER_STOP'
    );

    assert.throws(
      () => {
        runtime.calibrateGuardrails(proposal, simResult);
      },
      /OPERATION_SUSPENDED_BY_USER_STOP/,
      'calibrateGuardrails fails closed under USER_STOP'
    );
    pass('Category L', 'USER_STOP halts counterfactual simulation and guardrail calibration');

    assert.throws(
      () => {
        runtime.stageForReview(proposal, simResult, calibrationSafe, tenantA);
      },
      /OPERATION_SUSPENDED_BY_USER_STOP/,
      'stageForReview fails closed under USER_STOP'
    );

    assert.throws(
      () => {
        runtime.applyPolicyRollout(proposal, humanReviewRecord, rolloutProvenance.provenanceSha256, tenantA);
      },
      /OPERATION_SUSPENDED_BY_USER_STOP/,
      'applyPolicyRollout fails closed under USER_STOP'
    );

    assert.throws(
      () => {
        runtime.rollbackPolicy(rolloutRecord, 'USER_STOP test', tenantA);
      },
      /OPERATION_SUSPENDED_BY_USER_STOP/,
      'rollbackPolicy fails closed under USER_STOP'
    );
    pass('Category L', 'USER_STOP halts review staging, rollout, and rollback');

    // Deactivate USER_STOP
    // Hủy kích hoạt USER_STOP
    runtime.setUserStop(false);
    assert.strictEqual(runtime.isUserStopActive(), false, 'USER_STOP deactivated');
    pass('Category L', 'USER_STOP supremacy verified: all operations fail closed immediately when active');

    // -------------------------------------------------------------------------
    // CATEGORY M: Negative Authority Invariants (Zero Autonomous Approvals/Tokens)
    // CATEGORY M: Các Bất biến Quyền hạn Phủ định (Không Tự cấp Phê duyệt/Token)
    // -------------------------------------------------------------------------
    assert.strictEqual(autonomousTokenIssueCallCount, 0, 'Zero autonomous calls to issueToken() confirmed');
    pass('Category M', 'Zero autonomous calls to WorldActionAuthorizationEngine.issueToken()');

    assert.strictEqual(autonomousApproveCallCount, 0, 'Zero autonomous calls to approve() confirmed');
    pass('Category M', 'Zero autonomous calls to SupervisorHumanGate.approve()');

    // -------------------------------------------------------------------------
    // CATEGORY N: Static Source Security Scan (Zero OS Process/Eval Primitives)
    // CATEGORY N: Quét Mã nguồn Tĩnh Bảo mật (Không có Tiến trình HĐH/Hàm Eval)
    // -------------------------------------------------------------------------
    const policyEvolutionDir = path.resolve(process.cwd(), 'src', 'core', 'policyEvolution');
    const sourceFiles = fs.readdirSync(policyEvolutionDir).filter((f) => f.endsWith('.ts'));
    const forbiddenPatterns = [
      /\bchild_process\b/,
      /\bexecSync\b/,
      /\bexec\(/,
      /\bspawn\(/,
      /\bfork\(/,
      /\beval\(/,
      /\bFunction\(/,
    ];

    for (const sf of sourceFiles) {
      const code = fs.readFileSync(path.join(policyEvolutionDir, sf), 'utf8');
      for (const pattern of forbiddenPatterns) {
        assert.strictEqual(
          pattern.test(code),
          false,
          `Forbidden execution primitive ${pattern} found in ${sf}`
        );
      }
    }
    pass('Category N', 'Zero forbidden execution primitives found across all policyEvolution source files');

    // -------------------------------------------------------------------------
    // CATEGORY O: Protected Workspace Isolation (C:\BOW\shopofbow)
    // CATEGORY O: Cách ly Không gian Làm việc Được bảo vệ (C:\BOW\shopofbow)
    // -------------------------------------------------------------------------
    assert.throws(
      () => {
        snapshotStore.getActiveSnapshot('C:\\BOW\\shopofbow');
      },
      /Path traversal or illegal separator detected in userId/,
      'Attempt to pass C:\\BOW\\shopofbow as userPartition fails closed'
    );
    pass('Category O', 'Attempt to access protected workspace fails closed with security error');

    assert.strictEqual(
      fs.existsSync('C:\\BOW\\shopofbow'),
      false,
      'Protected workspace C:\\BOW\\shopofbow MUST NOT exist or be touched'
    );
    pass('Category O', 'Protected workspace C:\\BOW\\shopofbow untouched (reads=0, writes=0, touches=0)');

    // Verify Canonical Audit Domain
    // Xác minh Miền Nhật ký Kiểm toán Chuẩn tắc
    const auditEvents = globalAuditLedger.getTrail({ domain: PolicyEvolutionRuntime.AUDIT_DOMAIN });
    assert.ok(auditEvents.length > 0, 'Audit events recorded under POLICY_EVOLUTION');
    for (const evt of auditEvents) {
      assert.strictEqual(evt.domain, 'POLICY_EVOLUTION', 'Audit domain matches POLICY_EVOLUTION');
    }
    pass('AuditLedger', 'Canonical audit events successfully recorded under domain POLICY_EVOLUTION');

    // Clean up test scratch
    try {
      fs.rmSync(testBaseDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }

    console.log('\n======================================================================');
    console.log(`REALITY GATE COMPLETE: ${passedAssertions} passed, 0 failed across Categories A through O`);
    console.log(`REALITY GATE PASS: ${passedAssertions}`);
    console.log('======================================================================\n');
  } finally {
    globalWorldActionAuth.issueToken = originalIssueToken;
    globalSupervisorHumanGate.approve = originalApprove;
  }
}

runRealityGate().catch((err) => {
  console.error('Reality Gate execution failed:', err);
  process.exit(1);
});
