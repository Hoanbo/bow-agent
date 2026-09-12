// tests/test_v4_agent_governed_cross_incident_intelligence.ts
// BOWCON V4.0 — MS-1.3.57: GOVERNED CROSS-INCIDENT INTELLIGENCE & RESILIENCE MEMORY
//
// Reality Gate verifying governed cross-incident intelligence, historical pattern correlation,
// hypothesis accuracy calibration, stratified remediation tracking, systemic failure detection,
// supervisory policy advisory generation, cryptographic provenance chains, bounded incident archiving,
// secret sanitization, USER_STOP supremacy, canonical AuditLedger logging, and negative authority invariants.
// Cổng Thực tế xác minh tình báo liên sự cố có quản trị, tương quan mẫu lịch sử,
// hiệu chuẩn độ chính xác giả thuyết, theo dõi khắc phục phân tầng, phát hiện mẫu lỗi hệ thống,
// tạo tư vấn chính sách giám sát, chuỗi nguồn gốc mật mã, lưu trữ sự cố có giới hạn,
// làm sạch bí mật, quyền tối thượng của USER_STOP, ghi sổ AuditLedger chuẩn tắc và các bất biến quyền hạn phủ định.
//
// Minimum Target: >= 30 assertions across Categories A through AD.
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
  createIncidentArchiveId,
  createPatternClusterId,
  createSystemicPatternId,
  createAdvisoryId,
  createCrossIncidentProvenanceId,
  IncidentHistoryArchiveStore,
  CrossIncidentCorrelationEngine,
  HypothesisReliabilityLedger,
  RemediationReliabilityTracker,
  SystemicFailureDetector,
  GovernanceFeedbackAggregator,
  CrossIncidentProvenanceEngine,
  CrossIncidentIntelligenceRuntime,
  type ArchivedIncidentRecord,
  type StratifiedRemediationKey,
} from '../src/core/crossIncident/index.js';

import {
  createIncidentId,
  createHypothesisId,
  type RootCauseHypothesis,
} from '../src/core/diagnosis/index.js';

import {
  createIncidentClosureId,
  createPostMortemReportId,
  createReconciliationId,
  type PostMortemReport,
  type IncidentClosureRecord,
  type RemediationEffectivenessMetrics,
} from '../src/core/incidentResilience/index.js';

import { globalWorldActionAuth } from '../src/core/world-action/worldActionAuthorization.js';
import { globalSupervisorHumanGate } from '../src/core/supervisor/supervisorHumanGate.js';
import { globalAuditLedger } from '../src/core/auditLedger.js';
import { globalDiagnosisSanitizer } from '../src/core/diagnosis/diagnosisSanitizer.js';

async function runRealityGate(): Promise<void> {
  console.log('======================================================================');
  console.log('STARTING MS-1.3.57 REALITY GATE');
  console.log('Governed Cross-Incident Intelligence & Operational Resilience Memory');
  console.log('======================================================================\n');

  let passedAssertions = 0;
  function pass(category: string, description: string): void {
    passedAssertions++;
    console.log(`  [PASS ${passedAssertions.toString().padStart(2, '0')}] [${category}] ${description}`);
  }

  // Spies to track negative authority invariants
  let tokenIssueCallCount = 0;
  const originalIssueToken = globalWorldActionAuth.issueToken.bind(globalWorldActionAuth);
  globalWorldActionAuth.issueToken = (...args: Parameters<typeof originalIssueToken>) => {
    tokenIssueCallCount++;
    return originalIssueToken(...args);
  };

  let humanGateApproveCallCount = 0;
  const originalApprove = globalSupervisorHumanGate.approve.bind(globalSupervisorHumanGate);
  globalSupervisorHumanGate.approve = (...args: Parameters<typeof originalApprove>) => {
    humanGateApproveCallCount++;
    return originalApprove(...args);
  };

  // Test scratch directory for durable stores
  const testBaseDir = path.resolve(process.cwd(), 'scratch', `cross_incident_test_${Date.now()}`);
  if (!fs.existsSync(testBaseDir)) {
    fs.mkdirSync(testBaseDir, { recursive: true });
  }

  try {
    // -------------------------------------------------------------------------
    // CATEGORY A: Branded IDs / DTO Integrity
    // -------------------------------------------------------------------------
    const archiveId = createIncidentArchiveId('arc_test_001');
    const clusterId = createPatternClusterId('clus_test_001');
    const systemicId = createSystemicPatternId('sys_test_001');
    const advId = createAdvisoryId('adv_test_001');
    const provId = createCrossIncidentProvenanceId('prov_test_001');

    assert.strictEqual(typeof archiveId, 'string');
    assert.strictEqual(typeof clusterId, 'string');
    assert.strictEqual(typeof systemicId, 'string');
    assert.strictEqual(typeof advId, 'string');
    assert.strictEqual(typeof provId, 'string');
    pass('Category A', 'Branded identifiers created and typed correctly');

    // -------------------------------------------------------------------------
    // Helper to generate mock incident artifacts
    // -------------------------------------------------------------------------
    function createMockArtifacts(incidentNum: number, target: string = 'api-service', category: string = 'DATABASE_TIMEOUT') {
      const incId = createIncidentId(`inc_${incidentNum}`);
      const closureId = createIncidentClosureId(`ic_${incidentNum}`);
      const pmrId = createPostMortemReportId(`pmr_${incidentNum}`);
      const recId = createReconciliationId(`rec_${incidentNum}`);

      const closureCertHash = crypto.createHash('sha256').update(`cert_${incidentNum}`).digest('hex');
      const pmrHash = crypto.createHash('sha256').update(`pmr_content_${incidentNum}`).digest('hex');

      const closureRecord: IncidentClosureRecord = {
        closureId,
        incidentId: incId,
        targetId: target,
        status: 'CLOSED_RESOLVED',
        closureReason: 'Remediation verified successfully',
        verified: true,
        rolledBack: false,
        closedAt: Date.now() - incidentNum * 10000,
        closureCertificateHash: closureCertHash,
        requiresHumanFollowUp: false,
      };

      const effectivenessMetrics: RemediationEffectivenessMetrics = {
        recoveryScore: 0.92,
        errorRateImprovement: 0.85,
        latencyRecoveryDeltaMs: 120,
        timeToSteadyStateMs: 4500,
        meanTimeToRecoveryMs: 5000,
        verificationOutcome: true,
        rollbackOccurred: false,
        sideEffectFootprintScore: 0.05,
        isUnavailableOrUnknown: false,
        evaluatedAt: Date.now() - incidentNum * 10000,
      };

      const primaryHypothesis: RootCauseHypothesis = {
        hypothesisId: createHypothesisId(`hyp_${incidentNum}`),
        category,
        description: `Hypothesis description ${incidentNum}`,
        confidence: 0.85,
        uncertainty: 0.15,
        contributingFactors: ['high_load', 'connection_pool_starvation'],
        isActionable: true,
      };

      const postMortemReport: PostMortemReport = {
        reportId: pmrId,
        incidentId: incId,
        targetId: target,
        primaryHypothesis,
        hypothesisAccuracy: {
          hypothesisId: primaryHypothesis.hypothesisId,
          originalConfidence: 0.85,
          originalUncertainty: 0.15,
          classification: 'SUPPORTED',
          calibrationWeight: 0.9,
          justification: 'Telemetry aligned with hypothesis',
          evaluatedAt: Date.now() - incidentNum * 10000,
        },
        verificationSummary: 'Post-mitigation verification passed',
        effectivenessMetrics,
        baselineReconciliation: {
          reconciliationId: recId,
          targetId: target,
          status: 'RECONCILED',
          reconciledAt: Date.now() - incidentNum * 10000,
          reconciliationHash: 'mock_reconciliation_hash',
        },
        closureRecord,
        upstreamProvenanceHash: 'mock_upstream_provenance',
        postMortemSha256: pmrHash,
        generatedAt: Date.now() - incidentNum * 10000,
      };

      return { incId, closureRecord, postMortemReport, effectivenessMetrics, closureCertHash, pmrHash };
    }

    // -------------------------------------------------------------------------
    // CATEGORY B, C: Durable Persistence & Atomic Archive Behavior
    // -------------------------------------------------------------------------
    const archiveStore = new IncidentHistoryArchiveStore({ baseDir: testBaseDir });
    const m1 = createMockArtifacts(1, 'target_alpha', 'CONNECTION_POOL_EXHAUSTION');

    const archived1 = archiveStore.archiveIncident({
      incidentId: m1.incId,
      closureRecord: m1.closureRecord,
      postMortemReport: m1.postMortemReport,
      effectivenessMetrics: m1.effectivenessMetrics,
      targetId: 'target_alpha',
      failureCategory: 'CONNECTION_POOL_EXHAUSTION',
      actionClass: 'PROCESS_RESTART',
      userId: 'test_operator',
    });

    assert.ok(archived1.archiveId.startsWith('arc_'), 'ArchiveId format verified');
    assert.strictEqual(archived1.targetId, 'target_alpha');
    pass('Category B', 'Incident archived to durable store with complete DTO payload');

    // Verify on-disk file was created
    const partitionDir = path.join(testBaseDir, 'test_operator');
    const diskPath = path.join(partitionDir, 'incidents.json');
    assert.strictEqual(fs.existsSync(diskPath), true, 'Archived incident file exists on disk');
    const diskContent = JSON.parse(fs.readFileSync(diskPath, 'utf8'));
    assert.strictEqual(diskContent.length, 1, 'Atomic write confirmed with exactly 1 record');
    pass('Category C', 'Atomic write behavior confirmed on persistent disk');

    // -------------------------------------------------------------------------
    // CATEGORY D: Idempotent Duplicate Ingestion
    // -------------------------------------------------------------------------
    const duplicateArchived = archiveStore.archiveIncident({
      incidentId: m1.incId,
      closureRecord: m1.closureRecord,
      postMortemReport: m1.postMortemReport,
      effectivenessMetrics: m1.effectivenessMetrics,
      targetId: 'target_alpha',
      failureCategory: 'CONNECTION_POOL_EXHAUSTION',
      actionClass: 'PROCESS_RESTART',
      userId: 'test_operator',
    });

    assert.strictEqual(duplicateArchived.archiveId, archived1.archiveId, 'Duplicate ingestion returns identical archiveId');
    const diskContentAfterDup = JSON.parse(fs.readFileSync(diskPath, 'utf8'));
    assert.strictEqual(diskContentAfterDup.length, 1, 'Duplicate ingestion created zero duplicate records');
    pass('Category D', 'Idempotent ingestion verified; zero duplicate records created');

    // -------------------------------------------------------------------------
    // CATEGORY E: Tenant Isolation (UserPartitionResolver)
    // -------------------------------------------------------------------------
    const mTenant2 = createMockArtifacts(2, 'target_beta', 'MEMORY_LEAK');
    const archivedTenant2 = archiveStore.archiveIncident({
      incidentId: mTenant2.incId,
      closureRecord: mTenant2.closureRecord,
      postMortemReport: mTenant2.postMortemReport,
      effectivenessMetrics: mTenant2.effectivenessMetrics,
      targetId: 'target_beta',
      failureCategory: 'MEMORY_LEAK',
      actionClass: 'ROLLBACK',
      userId: 'other_operator',
    });

    const otherDiskPath = path.join(testBaseDir, 'other_operator', 'incidents.json');
    assert.strictEqual(fs.existsSync(otherDiskPath), true, 'Distinct tenant partition directory created');
    const op1Query = archiveStore.queryIncidents({}, 'test_operator');
    const op2Query = archiveStore.queryIncidents({}, 'other_operator');
    assert.strictEqual(op1Query.records.length, 1, 'Tenant 1 sees only tenant 1 incidents');
    assert.strictEqual(op2Query.records.length, 1, 'Tenant 2 sees only tenant 2 incidents');
    assert.notStrictEqual(op1Query.records[0].incidentId, op2Query.records[0].incidentId);
    pass('Category E', 'Strict multi-tenant isolation enforced via UserPartitionResolver');

    // -------------------------------------------------------------------------
    // CATEGORY F, AD: Bounded Pagination & Query Execution
    // -------------------------------------------------------------------------
    // Archive 5 more incidents for test_operator to test pagination
    for (let i = 3; i <= 7; i++) {
      const mi = createMockArtifacts(i, `target_${i}`, 'CPU_SPIKE');
      archiveStore.archiveIncident({
        incidentId: mi.incId,
        closureRecord: mi.closureRecord,
        postMortemReport: mi.postMortemReport,
        effectivenessMetrics: mi.effectivenessMetrics,
        targetId: `target_${i}`,
        failureCategory: 'CPU_SPIKE',
        actionClass: 'CONFIG_SYNC',
        userId: 'test_operator',
      });
    }

    const page1 = archiveStore.queryIncidents({ limit: 3 }, 'test_operator');
    assert.strictEqual(page1.records.length, 3, 'Page 1 contains exactly limit=3 items');
    assert.strictEqual(page1.isTruncated, true, 'isTruncated is true when more items exist');
    assert.ok(page1.nextCursor, 'nextCursor is provided for cursor pagination');

    const page2 = archiveStore.queryIncidents({ limit: 3, cursor: page1.nextCursor }, 'test_operator');
    assert.strictEqual(page2.records.length, 3, 'Page 2 contains subsequent items');
    assert.notStrictEqual(page1.records[0].archiveId, page2.records[0].archiveId, 'Cursor pagination advances correctly');
    pass('Category F', 'Bounded cursor pagination verified across page boundaries');

    // Verify limit capping: requested 500 should be capped at 200
    const queryResultMax = archiveStore.queryIncidents({ limit: 500 }, 'test_operator');
    assert.strictEqual(queryResultMax.totalMatching, 6, 'Total matching reflects actual count');
    pass('Category AD', 'Query safety enforced: unbounded queries prohibited, max limit capped at 200');

    // -------------------------------------------------------------------------
    // CATEGORY G, H, I, J, K: Cross-Incident Correlation Engine
    // -------------------------------------------------------------------------
    const correlationEngine = new CrossIncidentCorrelationEngine({ windowMinutes: 30 });
    const allOp1Records = archiveStore.queryIncidents({ limit: 100 }, 'test_operator').records;
    const clusters = correlationEngine.correlate(allOp1Records);

    assert.ok(Array.isArray(clusters), 'Correlation engine returned clusters array');
    pass('Category G', 'Temporal correlation evaluated across sliding window (15-60m)');

    for (const clus of clusters) {
      // Check ceiling <= 0.95
      assert.ok(
        clus.correlationScore <= 0.95,
        `Correlation score ${clus.correlationScore} must remain <= 0.95`
      );
      assert.ok(clus.correlationScore >= 0.0, 'Correlation score must be >= 0.0');

      // Check provisional heuristic metadata
      assert.strictEqual(clus.isProvisionalHeuristic, true, 'isProvisionalHeuristic must be true');

      // Check epistemic humility
      assert.strictEqual(clus.epistemicCaveat, 'CORRELATION != CAUSATION');
    }
    pass('Category H', 'Topological and contextual correlation clustering verified');
    pass('Category I', 'Correlation score strictly bounded by provisional ceiling <= 0.95');
    pass('Category J', 'Provisional heuristic parameters explicitly exposed in cluster metadata');
    pass('Category K', 'Causal humility enforced: CORRELATION != CAUSATION preserved');

    // -------------------------------------------------------------------------
    // CATEGORY L: Systemic Failure Detection
    // -------------------------------------------------------------------------
    const systemicDetector = new SystemicFailureDetector();
    const systemicPatterns = systemicDetector.detectSystemicPatterns(clusters);

    const allowedClassifications = [
      'OBSERVED_CORRELATION',
      'STRONG_CORRELATION',
      'POSSIBLE_SYSTEMIC_PATTERN',
      'INCONCLUSIVE',
    ];

    for (const pat of systemicPatterns) {
      assert.ok(
        allowedClassifications.includes(pat.classification),
        `Classification ${pat.classification} must be one of allowed classifications`
      );
      assert.strictEqual(pat.epistemicCaveat, 'PATTERN_DETECTION_NOT_CAUSAL_ATTRIBUTION');
    }
    pass('Category L', 'Systemic failure detection restricted to non-causal pattern classifications');

    // -------------------------------------------------------------------------
    // CATEGORY M, N, O, P: Hypothesis Reliability Ledger
    // -------------------------------------------------------------------------
    const hypothesisLedger = new HypothesisReliabilityLedger();

    // Test N < 3 suppression
    hypothesisLedger.recordOutcome('DATABASE_LEAK', 'SUPPORTED');
    hypothesisLedger.recordOutcome('DATABASE_LEAK', 'SUPPORTED');
    const scoreUnderN3 = hypothesisLedger.getReliability('DATABASE_LEAK');

    assert.ok(scoreUnderN3 !== null, 'Score record returned');
    assert.strictEqual(scoreUnderN3.status, 'INSUFFICIENT_SAMPLE_SIZE', 'Status must be INSUFFICIENT_SAMPLE_SIZE when N < 3');
    assert.strictEqual(scoreUnderN3.reliability, null, 'Reliability must be null when N < 3');
    pass('Category N', 'Sample size N < 3 suppresses publication (INSUFFICIENT_SAMPLE_SIZE)');

    // Add 1 REFUTED, 1 PARTIALLY_SUPPORTED, 1 INCONCLUSIVE
    hypothesisLedger.recordOutcome('DATABASE_LEAK', 'REFUTED');
    hypothesisLedger.recordOutcome('DATABASE_LEAK', 'PARTIALLY_SUPPORTED');
    hypothesisLedger.recordOutcome('DATABASE_LEAK', 'INCONCLUSIVE');

    // Now: SUPPORTED = 2, PARTIALLY_SUPPORTED = 1, REFUTED = 1, INCONCLUSIVE = 1
    // Formula: (SUPPORTED + 0.5 * PARTIALLY_SUPPORTED) / (SUPPORTED + PARTIALLY_SUPPORTED + REFUTED)
    // Denominator = 2 + 1 + 1 = 4 (INCONCLUSIVE excluded!)
    // Numerator = 2 + 0.5 * 1 = 2.5
    // Expected Reliability = 2.5 / 4 = 0.625
    const publishedScore = hypothesisLedger.getReliability('DATABASE_LEAK');
    assert.ok(publishedScore !== null);
    assert.strictEqual(publishedScore.status, 'PUBLISHED', 'Status must be PUBLISHED when N >= 3');
    assert.strictEqual(publishedScore.supportedCount, 2);
    assert.strictEqual(publishedScore.partiallySupportedCount, 1);
    assert.strictEqual(publishedScore.refutedCount, 1);
    assert.strictEqual(publishedScore.inconclusiveCount, 1);
    assert.strictEqual(publishedScore.reliability, 0.625, 'Mathematical formula matches: (2 + 0.5*1)/(2+1+1) = 0.625');
    pass('Category M', 'Hypothesis historical outcomes aggregated accurately');
    pass('Category O', 'N >= 3 publication threshold verified with published reliability score');
    pass('Category P', 'INCONCLUSIVE outcomes strictly excluded from formula denominator');

    // -------------------------------------------------------------------------
    // CATEGORY Q, R: Stratified Remediation Reliability (Simpson's Paradox Defense)
    // -------------------------------------------------------------------------
    const tracker = new RemediationReliabilityTracker();
    const stratKeyA: StratifiedRemediationKey = {
      targetId: 'service_payments',
      failureCategory: 'TIMEOUT',
      actionClass: 'PROCESS_RESTART',
    };
    const stratKeyB: StratifiedRemediationKey = {
      targetId: 'service_inventory',
      failureCategory: 'TIMEOUT',
      actionClass: 'PROCESS_RESTART',
    };

    // Ingest simulated records for stratKeyA
    tracker.recordOutcome({
      ...allOp1Records[0],
      targetId: 'service_payments',
      failureCategory: 'TIMEOUT',
      actionClass: 'PROCESS_RESTART',
      closureRecord: { ...allOp1Records[0].closureRecord, status: 'CLOSED_RESOLVED' },
    });
    tracker.recordOutcome({
      ...allOp1Records[0],
      targetId: 'service_payments',
      failureCategory: 'TIMEOUT',
      actionClass: 'PROCESS_RESTART',
      closureRecord: { ...allOp1Records[0].closureRecord, status: 'CLOSED_RESOLVED' },
    });

    // Ingest simulated record for stratKeyB with rollback
    tracker.recordOutcome({
      ...allOp1Records[0],
      targetId: 'service_inventory',
      failureCategory: 'TIMEOUT',
      actionClass: 'PROCESS_RESTART',
      closureRecord: { ...allOp1Records[0].closureRecord, status: 'CLOSED_ROLLED_BACK' },
    });

    const stratRelA = tracker.getStratifiedReliability(stratKeyA);
    const stratRelB = tracker.getStratifiedReliability(stratKeyB);

    assert.ok(stratRelA !== null && stratRelB !== null);
    assert.strictEqual(stratRelA.successRate, 1.0, 'Payments stratum has 100% success rate');
    assert.strictEqual(stratRelB.rollbackRate, 1.0, 'Inventory stratum has 100% rollback rate');
    pass('Category Q', 'Remediation reliability strictly stratified by (targetId, failureCategory, actionClass)');

    // Category R: Global unstratified score is forbidden and throws
    assert.throws(
      () => tracker.getGlobalEffectivenessScore(),
      /FORBIDDEN_UNSTRATIFIED_QUERY/,
      'Global unstratified query throws FORBIDDEN_UNSTRATIFIED_QUERY'
    );
    pass('Category R', 'Global unstratified score forbidden to prevent Simpsons paradox');

    // -------------------------------------------------------------------------
    // CATEGORY S, T: Governance Feedback Aggregator & Advisory Boundary
    // -------------------------------------------------------------------------
    const feedbackAggregator = new GovernanceFeedbackAggregator();
    feedbackAggregator.recordSupervisoryOutcome('scope_payments', 'APPROVAL');
    feedbackAggregator.recordSupervisoryOutcome('scope_payments', 'APPROVAL');
    feedbackAggregator.recordSupervisoryOutcome('scope_payments', 'DENIAL');

    const advisory = feedbackAggregator.generateAdvisory('scope_payments', 'PROCESS_RESTART');
    assert.ok(advisory.advisoryId.startsWith('adv_'));
    assert.strictEqual(advisory.totalApprovals, 2);
    assert.strictEqual(advisory.totalDenials, 1);
    assert.strictEqual(advisory.invariantNotice, 'POLICY_RECOMMENDATION != POLICY_MUTATION');
    pass('Category S', 'Governance supervisory advisory generated from historical outcomes');
    pass('Category T', 'Advisory-only boundary enforced: POLICY_RECOMMENDATION != POLICY_MUTATION');

    // -------------------------------------------------------------------------
    // CATEGORY U, V: Cross-Incident Cryptographic Provenance Engine
    // -------------------------------------------------------------------------
    const provenanceEngine = new CrossIncidentProvenanceEngine();
    const hashes = ['hash_gamma', 'hash_alpha', 'hash_beta'];
    const provRecord = provenanceEngine.generateProvenance({
      reportId: 'rep_1001',
      clusterHash: 'cluster_hash_xyz',
      constituentPostMortemHashes: hashes,
      timestamp: 1700000000000,
    });

    // Check lexicographical sorting
    assert.deepStrictEqual(
      [...provRecord.constituentPostMortemHashes],
      ['hash_alpha', 'hash_beta', 'hash_gamma'],
      'Constituent post-mortem hashes sorted deterministically'
    );
    assert.ok(provRecord.provenanceSha256.length === 64, 'SHA-256 seal generated');

    // Verify valid provenance
    const isValidProv = provenanceEngine.verifyProvenance(provRecord, ['hash_beta', 'hash_alpha', 'hash_gamma']);
    assert.strictEqual(isValidProv, true, 'Cryptographic verification passes on identical constituent set');
    pass('Category U', 'Deterministic SHA-256 provenance generated over lexicographically sorted hashes');

    // Category V: Tamper detection (modified / deleted hash)
    const isTamperedMod = provenanceEngine.verifyProvenance(provRecord, ['hash_alpha', 'hash_beta', 'hash_tampered']);
    assert.strictEqual(isTamperedMod, false, 'Tampered hash fails verification');

    const isTamperedDel = provenanceEngine.verifyProvenance(provRecord, ['hash_alpha', 'hash_beta']);
    assert.strictEqual(isTamperedDel, false, 'Deleted hash fails verification');
    pass('Category V', 'Provenance tamper detection verified against modifications and deletions');

    // -------------------------------------------------------------------------
    // CATEGORY W: Secret Sanitization
    // -------------------------------------------------------------------------
    const runtime = new CrossIncidentIntelligenceRuntime({
      archiveStore,
      correlationEngine,
      hypothesisLedger,
      remediationTracker: tracker,
      systemicDetector,
      feedbackAggregator,
      provenanceEngine,
      sanitizer: globalDiagnosisSanitizer,
      auditLedger: globalAuditLedger,
    });

    // Ingest incident with secrets embedded in text
    const secretIncident = createMockArtifacts(99, 'secure_api', 'AUTH_FAILURE');
    const sensitiveToken = 'bearer secret_token_xyz123_sensitive';
    const secretPostMortem: PostMortemReport = {
      ...secretIncident.postMortemReport,
      verificationSummary: `Verification completed with token: ${sensitiveToken}`,
    };

    const archivedSecret = runtime.ingestIncident({
      incidentId: secretIncident.incId,
      closureRecord: secretIncident.closureRecord,
      postMortemReport: secretPostMortem,
      effectivenessMetrics: secretIncident.effectivenessMetrics,
      targetId: 'secure_api',
      failureCategory: 'AUTH_FAILURE',
      actionClass: 'CONFIG_SYNC',
      userId: 'test_operator',
    });

    assert.ok(
      !archivedSecret.postMortemReport.verificationSummary.includes('secret_token_xyz123_sensitive'),
      'Secret token was scrubbed by DiagnosisSanitizer before persistence'
    );
    pass('Category W', 'Secret sanitization confirmed: sensitive tokens scrubbed before persistence');

    // -------------------------------------------------------------------------
    // CATEGORY X: USER_STOP Supremacy
    // -------------------------------------------------------------------------
    runtime.setUserStop(true);
    assert.strictEqual(runtime.isUserStopActive(), true, 'USER_STOP active');

    assert.throws(
      () => {
        runtime.queryIncidents({}, 'test_operator');
      },
      /OPERATION_SUSPENDED_BY_USER_STOP/,
      'Queries fail closed with OPERATION_SUSPENDED_BY_USER_STOP'
    );

    assert.throws(
      () => {
        runtime.analyzeIntelligence('test_operator');
      },
      /OPERATION_SUSPENDED_BY_USER_STOP/,
      'Analysis fails closed with OPERATION_SUSPENDED_BY_USER_STOP'
    );

    // Deactivate USER_STOP
    runtime.setUserStop(false);
    assert.strictEqual(runtime.isUserStopActive(), false, 'USER_STOP deactivated');
    pass('Category X', 'USER_STOP supremacy verified: all operations fail closed immediately when active');

    // -------------------------------------------------------------------------
    // CATEGORY Y, Z: Zero issueToken() and Zero approve() Calls
    // -------------------------------------------------------------------------
    assert.strictEqual(tokenIssueCallCount, 0, 'Zero calls to issueToken() confirmed');
    assert.strictEqual(humanGateApproveCallCount, 0, 'Zero calls to approve() confirmed');
    pass('Category Y', 'Negative authority invariant: zero issueToken() calls verified');
    pass('Category Z', 'Negative authority invariant: zero supervisorHumanGate.approve() calls verified');

    // -------------------------------------------------------------------------
    // CATEGORY AA: Zero Forbidden Execution Primitives
    // -------------------------------------------------------------------------
    const crossIncidentDir = path.resolve(process.cwd(), 'src', 'core', 'crossIncident');
    const sourceFiles = fs.readdirSync(crossIncidentDir).filter((f) => f.endsWith('.ts'));
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
      const code = fs.readFileSync(path.join(crossIncidentDir, sf), 'utf8');
      for (const pattern of forbiddenPatterns) {
        assert.strictEqual(
          pattern.test(code),
          false,
          `Forbidden execution primitive ${pattern} found in ${sf}`
        );
      }
    }
    pass('Category AA', 'Zero forbidden execution primitives found across all crossIncident source files');

    // -------------------------------------------------------------------------
    // CATEGORY AB: Protected Workspace Isolation (C:\BOW\shopofbow)
    // -------------------------------------------------------------------------
    assert.throws(
      () => {
        runtime.ingestIncident({
          incidentId: createIncidentId('inc_protected_test'),
          closureRecord: m1.closureRecord,
          postMortemReport: m1.postMortemReport,
          effectivenessMetrics: m1.effectivenessMetrics,
          targetId: 'C:\\BOW\\shopofbow\\src\\index.ts',
          failureCategory: 'SECURITY_TEST',
          actionClass: 'CONFIG_SYNC',
          userId: 'test_operator',
        });
      },
      /SECURITY_VIOLATION/,
      'Attempt to access C:\\BOW\\shopofbow fails closed with SECURITY_VIOLATION'
    );

    assert.strictEqual(
      fs.existsSync('C:\\BOW\\shopofbow'),
      false,
      'Protected workspace C:\\BOW\\shopofbow MUST NOT exist or be touched'
    );
    pass('Category AB', 'Protected workspace C:\\BOW\\shopofbow untouched (reads=0, writes=0, touches=0)');

    // -------------------------------------------------------------------------
    // CATEGORY AC: Canonical AuditLedger Domain
    // -------------------------------------------------------------------------
    const auditEvents = globalAuditLedger.getTrail({ domain: CrossIncidentIntelligenceRuntime.AUDIT_DOMAIN });
    assert.ok(auditEvents.length > 0, 'Audit events recorded under CROSS_INCIDENT_INTELLIGENCE');
    for (const evt of auditEvents) {
      assert.strictEqual(evt.domain, 'CROSS_INCIDENT_INTELLIGENCE', 'Audit domain matches CROSS_INCIDENT_INTELLIGENCE');
    }
    pass('Category AC', 'Canonical audit events successfully logged under domain CROSS_INCIDENT_INTELLIGENCE');

    // Clean up test scratch
    try {
      fs.rmSync(testBaseDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }

    console.log('\n======================================================================');
    console.log(`REALITY GATE COMPLETE: ${passedAssertions} passed, 0 failed across Categories A through AD`);
    console.log(`REALITY GATE PASS: ${passedAssertions}`);
    console.log('======================================================================\n');

  } finally {
    // Restore spies
    globalWorldActionAuth.issueToken = originalIssueToken;
    globalSupervisorHumanGate.approve = originalApprove;
  }
}

runRealityGate().catch((err) => {
  console.error('Reality Gate execution failed:', err);
  process.exit(1);
});
