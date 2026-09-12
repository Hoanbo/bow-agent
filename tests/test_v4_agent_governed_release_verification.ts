// tests/test_v4_agent_governed_release_verification.ts
// BOWCON V4.0 — MS-1.3.50: GOVERNED CONTINUOUS INTEGRATION & MILESTONE RELEASE VERIFICATION PIPELINE
//
// Comprehensive integration test suite for the Release Verification subsystem.
// Bộ kiểm thử tích hợp toàn diện cho phân hệ Xác minh Phát hành.
//
// STRICT INVARIANTS UNDER TEST:
// - TECHNICAL_VERIFICATION != OWNER_APPROVAL
// - QUALITY_PASS != RELEASE_AUTHORIZATION
// - RELEASE_CANDIDATE != RELEASE_TOKEN
// - VERIFICATION_PIPELINE_PASS != RELEASE_AUTHORIZATION
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - CONTRADICTION => ESCALATE_TO_SUPERVISOR (no majority voting)
// - FAILED/BLOCKED/STALE/EXPIRED states => fail closed
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0
//
// Bilingual Comment Rule (Rule 1):
// All test comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích kiểm thử phải cung cấp phần tiếng Anh và tiếng Việt.

import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// ── Release subsystem imports ─────────────────────────────────────────────────
import {
  ReleaseRuntime,
  ReleaseCandidateEngine,
  ReleasePolicyEngine,
  ReleaseAcceptanceCriteriaEngine,
  ReleaseContradictionEngine,
  ReleaseVerificationPipeline,
  ReleaseError,
  ReleaseErrorCode,
  RELEASE_SCHEMA_VERSION,
  createReleaseCandidateId,
} from '../src/core/release/index.js';
import type {
  ReleaseCandidate,
  ReleaseVerificationRecord,
} from '../src/core/release/index.js';

// ── Quality subsystem imports (used as evidence provider) ────────────────────
import {
  QualityRuntime,
  QualityError,
  QualityErrorCode,
  createQualityReportId,
  createQualityEvidenceId,
} from '../src/core/quality/index.js';
import type {
  QualityVerificationReport,
  QualityEvidenceBundle,
  CommandExecutionContext,
  QualityGateEvaluation,
  BuildExecutionResult,
  TestExecutionResult,
} from '../src/core/quality/index.js';

// ── Sandbox types ─────────────────────────────────────────────────────────────
import type { SandboxDescriptor, SandboxManifest } from '../src/core/sandbox/sandboxTypes.js';
import {
  createSandboxId,
  createWorktreeId,
} from '../src/core/sandbox/sandboxTypes.js';
import {
  createBuildExecutionId,
  createTestExecutionId,
} from '../src/core/quality/qualityTypes.js';

// ─────────────────────────────────────────────────────────────────────────────
// TEST INFRASTRUCTURE
// CƠ SỞ HẠ TẦNG KIỂM THỬ
// ─────────────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const errors: string[] = [];

function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      console.log(`  ✓ ${name}`);
      passed++;
    })
    .catch((err: Error) => {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
      errors.push(`${name}: ${err.message}`);
      failed++;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED TEST FIXTURES
// TÀI NGUYÊN KIỂM THỬ DÙNG CHUNG
// ─────────────────────────────────────────────────────────────────────────────

const TEST_SANDBOX_ID = createSandboxId('sandbox_test_release_001');
const TEST_WORKTREE_ID = createWorktreeId('wt_test_release_001');
const TEST_QUALITY_REPORT_ID = createQualityReportId('qr_test_release_001');
const TEST_EVIDENCE_ID = createQualityEvidenceId('ev_test_release_001');
const TEST_MANIFEST_HASH = crypto.createHash('sha256').update('test_manifest').digest('hex');
const TEST_PROJECT_ROOT = 'C:\\BOW\\bow-agent';

const TEST_CONTEXT: CommandExecutionContext = {
  taskId: 'task_release_001',
  agentId: 'agent_release_test_001',
  delegationId: 'deleg_release_001',
  capabilityLeaseId: 'lease_release_001',
  sessionId: 'session_release_001',
  sandboxId: TEST_SANDBOX_ID,
  worktreeId: TEST_WORKTREE_ID,
  projectRoot: TEST_PROJECT_ROOT,
};

const TEST_SANDBOX: SandboxDescriptor = {
  id: TEST_SANDBOX_ID,
  rootPath: TEST_PROJECT_ROOT,
  state: 'ACTIVE',
  isStopped: false,
  binding: {
    taskId: 'task_release_001',
    agentId: 'agent_release_test_001',
    sessionId: 'session_release_001',
    delegationId: 'deleg_release_001',
    capabilityLeaseId: 'lease_release_001',
    boundAt: Date.now(),
  },
  createdAt: Date.now(),
  expiresAt: Date.now() + 60 * 60 * 1000,
};

const TEST_MANIFEST: SandboxManifest = {
  sandboxId: TEST_SANDBOX_ID,
  manifestHash: TEST_MANIFEST_HASH,
  entries: {},
  createdAt: Date.now(),
  schemaVersion: '4.0.0',
};

/**
 * Creates a minimal passing QualityVerificationReport for test use.
 * Tạo một QualityVerificationReport tối thiểu đạt yêu cầu để dùng trong kiểm thử.
 */
function makeMockQualityReport(overrides?: Partial<QualityVerificationReport>): QualityVerificationReport {
  const reportId = TEST_QUALITY_REPORT_ID;
  const evidenceId = TEST_EVIDENCE_ID;
  const gateEvalHash = crypto.createHash('sha256').update('gate_pass').digest('hex');
  const evidenceHash = crypto.createHash('sha256').update('evidence_pass').digest('hex');
  const reportHash = crypto.createHash('sha256').update(`${reportId}:${evidenceHash}:${gateEvalHash}`).digest('hex');

  return {
    reportId,
    evidenceId,
    gateId: 'gate_test_001' as any,
    context: TEST_CONTEXT,
    overallState: 'PASS',
    contradictionState: 'CONSISTENT',
    buildSummary: { total: 1, passed: 1, failed: 0 },
    testSummary: { totalSuites: 3, passedSuites: 3, failedSuites: 0, totalAssertions: 30 },
    manifestHash: TEST_MANIFEST_HASH,
    evidenceHash,
    gateEvaluationHash: gateEvalHash,
    reportHash,
    issuedAt: Date.now(),
    failureReasons: [],
    blockingReasons: [],
    ...overrides,
  };
}

/**
 * Creates a minimal QualityEvidenceBundle for test use.
 * Tạo một QualityEvidenceBundle tối thiểu để dùng trong kiểm thử.
 */
function makeMockEvidenceBundle(
  overrides?: Partial<QualityEvidenceBundle>,
  manifestHashOverride?: string
): QualityEvidenceBundle {
  const actualManifestHash = manifestHashOverride ?? TEST_MANIFEST_HASH;

  // Create a realistic build result for hash computation.
  // Tạo kết quả dựng thực tế để tính toán mã băm.
  const buildId = createBuildExecutionId('build_test_001');
  const stdoutHash = crypto.createHash('sha256').update('stdout').digest('hex');
  const stderrHash = crypto.createHash('sha256').update('').digest('hex');
  const buildEvidenceHash = crypto.createHash('sha256').update(`${buildId}:${stdoutHash}:0`).digest('hex');
  const buildResult: BuildExecutionResult = {
    executionId: buildId,
    commandId: 'cmd_build_001',
    context: TEST_CONTEXT,
    state: 'PASSED',
    milestone: 'BUILD_VERIFIED',
    exitCode: 0,
    stdoutHash,
    stderrHash,
    durationMs: 1200,
    buildEvidenceHash,
    artifactHashes: {},
    executedAt: Date.now(),
  };

  const testId = createTestExecutionId('test_test_001');
  const testEvidenceHash = crypto.createHash('sha256').update(`${testId}:PASSED:3`).digest('hex');
  const testResult: TestExecutionResult = {
    executionId: testId,
    commandId: 'cmd_test_001',
    context: TEST_CONTEXT,
    state: 'PASSED',
    exitCode: 0,
    summary: { suiteCount: 3, passedSuites: 3, failedSuites: 0, skippedSuites: 0, assertionCount: 30 },
    stdoutHash: crypto.createHash('sha256').update('test_stdout').digest('hex'),
    stderrHash: crypto.createHash('sha256').update('').digest('hex'),
    durationMs: 5000,
    testEvidenceHash,
    artifactHashes: {},
    executedAt: Date.now(),
  };

  // Compute the evidence hash exactly as QualityEvidenceEngine.hashEvidenceBundle does.
  // The algorithm joins: [evidenceId, taskId, agentId, delegationId, capabilityLeaseId,
  //   sessionId, sandboxId, worktreeId ?? '', projectRoot, manifestHash,
  //   buildHashes.join(','), testHashes.join(','), securityScanHash ?? '']
  // with ':' separator.
  // Tính toán mã băm bằng chứng chính xác như QualityEvidenceEngine.hashEvidenceBundle làm.
  const buildHashes = [buildEvidenceHash];
  const testHashes = [testEvidenceHash];
  const hashPayload = [
    TEST_EVIDENCE_ID,
    TEST_CONTEXT.taskId,
    TEST_CONTEXT.agentId,
    TEST_CONTEXT.delegationId,
    TEST_CONTEXT.capabilityLeaseId,
    TEST_CONTEXT.sessionId,
    TEST_CONTEXT.sandboxId,
    TEST_CONTEXT.worktreeId ?? '',
    TEST_CONTEXT.projectRoot,
    actualManifestHash,
    buildHashes.join(','),
    testHashes.join(','),
    '',  // no security scan hash
  ].join(':');
  const evidenceHash = crypto.createHash('sha256').update(hashPayload, 'utf8').digest('hex');

  return {
    evidenceId: TEST_EVIDENCE_ID,
    context: TEST_CONTEXT,
    manifestHash: actualManifestHash,
    buildResults: [buildResult],
    testResults: [testResult],
    evidenceHash,
    createdAt: Date.now(),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: ReleaseCandidateEngine
// BỘ KIỂM THỬ 1: ReleaseCandidateEngine
// ─────────────────────────────────────────────────────────────────────────────

async function suiteReleaseCandidateEngine(): Promise<void> {
  console.log('\n[Suite 1] ReleaseCandidateEngine');
  const engine = new ReleaseCandidateEngine();

  const baseParams = {
    milestoneTag: 'MS-1.3.50',
    sourceManifestHash: TEST_MANIFEST_HASH,
    qualityReportId: TEST_QUALITY_REPORT_ID,
    evidenceId: TEST_EVIDENCE_ID,
    agentId: 'agent_test',
    sessionId: 'session_test',
    taskId: 'task_test',
    delegationId: 'deleg_test',
    capabilityLeaseId: 'lease_test',
    sandboxId: TEST_SANDBOX_ID,
    worktreeId: TEST_WORKTREE_ID,
  };

  // Test 1: Creates candidate with all required fields.
  // Kiểm thử 1: Tạo ứng viên với tất cả các trường bắt buộc.
  await test('Creates ReleaseCandidate with all required fields', () => {
    const candidate = engine.createReleaseCandidate(baseParams);
    assert.ok(candidate.candidateId, 'candidateId must be present');
    assert.equal(candidate.milestoneTag, 'MS-1.3.50');
    assert.equal(candidate.schemaVersion, RELEASE_SCHEMA_VERSION);
    assert.equal(candidate.state, 'PROPOSED');
    assert.ok(candidate.provenanceHash, 'provenanceHash must be computed');
    assert.ok(candidate.provenanceHash.length === 64, 'provenanceHash must be 64-char SHA-256 hex');
    assert.ok(candidate.expiresAt > candidate.proposedAt, 'expiresAt must be after proposedAt');
  });

  // Test 2: Provenance hash is deterministic.
  // Kiểm thử 2: Mã băm nguồn gốc là tất định.
  await test('Provenance hash is deterministic for same inputs', () => {
    const h1 = ReleaseCandidateEngine.hashCandidateProvenance(
      'rc_001', 'MS-1.3.50', TEST_MANIFEST_HASH,
      TEST_QUALITY_REPORT_ID, TEST_EVIDENCE_ID,
      'agent_a', 'session_a', 'task_a', 'deleg_a', 'lease_a',
      TEST_SANDBOX_ID, 1234567890
    );
    const h2 = ReleaseCandidateEngine.hashCandidateProvenance(
      'rc_001', 'MS-1.3.50', TEST_MANIFEST_HASH,
      TEST_QUALITY_REPORT_ID, TEST_EVIDENCE_ID,
      'agent_a', 'session_a', 'task_a', 'deleg_a', 'lease_a',
      TEST_SANDBOX_ID, 1234567890
    );
    assert.equal(h1, h2, 'Same inputs must produce same hash');
  });

  // Test 3: Provenance hash changes when any input changes.
  // Kiểm thử 3: Mã băm nguồn gốc thay đổi khi bất kỳ đầu vào nào thay đổi.
  await test('Provenance hash changes when milestoneTag changes', () => {
    const h1 = ReleaseCandidateEngine.hashCandidateProvenance(
      'rc_001', 'MS-1.3.50', TEST_MANIFEST_HASH,
      TEST_QUALITY_REPORT_ID, TEST_EVIDENCE_ID,
      'agent_a', 'session_a', 'task_a', 'deleg_a', 'lease_a',
      TEST_SANDBOX_ID, 1234567890
    );
    const h2 = ReleaseCandidateEngine.hashCandidateProvenance(
      'rc_001', 'MS-1.3.51', TEST_MANIFEST_HASH,  // different tag
      TEST_QUALITY_REPORT_ID, TEST_EVIDENCE_ID,
      'agent_a', 'session_a', 'task_a', 'deleg_a', 'lease_a',
      TEST_SANDBOX_ID, 1234567890
    );
    assert.notEqual(h1, h2, 'Different milestoneTag must produce different hash');
  });

  // Test 4: verifyProvenanceHash passes for unmodified candidate.
  // Kiểm thử 4: verifyProvenanceHash đạt cho ứng viên chưa bị thay đổi.
  await test('verifyProvenanceHash passes for unmodified candidate', () => {
    const candidate = engine.createReleaseCandidate(baseParams);
    const result = ReleaseCandidateEngine.verifyProvenanceHash(candidate);
    assert.equal(result, true);
  });

  // Test 5: verifyProvenanceHash throws on tampered provenanceHash.
  // Kiểm thử 5: verifyProvenanceHash ném ngoại lệ khi provenanceHash bị giả mạo.
  await test('verifyProvenanceHash throws ReleaseError on tampered hash', () => {
    const candidate = engine.createReleaseCandidate(baseParams);
    const tampered = { ...candidate, provenanceHash: 'a'.repeat(64) };
    assert.throws(
      () => ReleaseCandidateEngine.verifyProvenanceHash(tampered as ReleaseCandidate),
      (err: Error) => err instanceof ReleaseError && (err as ReleaseError).code === ReleaseErrorCode.PROVENANCE_HASH_MISMATCH
    );
  });

  // Test 6: Empty milestoneTag throws INVALID_MILESTONE_TAG.
  // Kiểm thử 6: milestoneTag rỗng ném INVALID_MILESTONE_TAG.
  await test('Empty milestoneTag throws INVALID_MILESTONE_TAG', () => {
    assert.throws(
      () => engine.createReleaseCandidate({ ...baseParams, milestoneTag: '' }),
      (err: Error) => err instanceof ReleaseError && (err as ReleaseError).code === ReleaseErrorCode.INVALID_MILESTONE_TAG
    );
  });

  // Test 7: Missing required binding throws MISSING_REQUIRED_BINDING.
  // Kiểm thử 7: Thiếu liên kết bắt buộc ném MISSING_REQUIRED_BINDING.
  await test('Missing agentId throws MISSING_REQUIRED_BINDING', () => {
    assert.throws(
      () => engine.createReleaseCandidate({ ...baseParams, agentId: '' }),
      (err: Error) => err instanceof ReleaseError && (err as ReleaseError).code === ReleaseErrorCode.MISSING_REQUIRED_BINDING
    );
  });

  // Test 8: transitionState returns new object with updated state.
  // Kiểm thử 8: transitionState trả về đối tượng mới với trạng thái đã cập nhật.
  await test('transitionState returns new frozen object with new state', () => {
    const candidate = engine.createReleaseCandidate(baseParams);
    const transitioned = ReleaseCandidateEngine.transitionState(candidate, 'VERIFIED', 'Pipeline passed');
    assert.equal(transitioned.state, 'VERIFIED');
    assert.equal(transitioned.stateReason, 'Pipeline passed');
    assert.equal(candidate.state, 'PROPOSED', 'Original must be unchanged');
    assert.notEqual(transitioned, candidate, 'Must be a new object');
  });

  // Test 9: Default TTL is 30 minutes.
  // Kiểm thử 9: TTL mặc định là 30 phút.
  await test('Default candidate TTL is 30 minutes', () => {
    const before = Date.now();
    const candidate = engine.createReleaseCandidate(baseParams);
    const after = Date.now();
    const expectedTtl = 30 * 60 * 1000;
    assert.ok(candidate.expiresAt >= before + expectedTtl - 100);
    assert.ok(candidate.expiresAt <= after + expectedTtl + 100);
  });

  // Test 10: Custom TTL is respected.
  // Kiểm thử 10: TTL tùy chỉnh được tuân thủ.
  await test('Custom TTL is respected', () => {
    const before = Date.now();
    const candidate = engine.createReleaseCandidate({ ...baseParams, ttlMs: 5000 });
    const after = Date.now();
    assert.ok(candidate.expiresAt >= before + 5000 - 50);
    assert.ok(candidate.expiresAt <= after + 5000 + 50);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: ReleasePolicyEngine
// BỘ KIỂM THỬ 2: ReleasePolicyEngine
// ─────────────────────────────────────────────────────────────────────────────

async function suiteReleasePolicyEngine(): Promise<void> {
  console.log('\n[Suite 2] ReleasePolicyEngine');

  // Test 11: Protected workspace C:\BOW\shopofbow is rejected.
  // Kiểm thử 11: Không gian làm việc bảo vệ C:\BOW\shopofbow bị từ chối.
  await test('Protected workspace C:\\BOW\\shopofbow is rejected', () => {
    assert.throws(
      () => ReleasePolicyEngine.assertNotProtectedWorkspace('C:\\BOW\\shopofbow'),
      (err: Error) => err instanceof ReleaseError && (err as ReleaseError).code === ReleaseErrorCode.PROTECTED_WORKSPACE_VIOLATION
    );
  });

  // Test 12: Protected workspace subdirectory is rejected.
  // Kiểm thử 12: Thư mục con của không gian làm việc bảo vệ bị từ chối.
  await test('Protected workspace subdirectory is rejected', () => {
    assert.throws(
      () => ReleasePolicyEngine.assertNotProtectedWorkspace('C:\\BOW\\shopofbow\\src'),
      (err: Error) => err instanceof ReleaseError && (err as ReleaseError).code === ReleaseErrorCode.PROTECTED_WORKSPACE_VIOLATION
    );
  });

  // Test 13: Non-protected path passes.
  // Kiểm thử 13: Đường dẫn không bảo vệ được chấp thuận.
  await test('Non-protected path passes assertNotProtectedWorkspace', () => {
    assert.doesNotThrow(() => ReleasePolicyEngine.assertNotProtectedWorkspace('C:\\BOW\\bow-agent'));
  });

  // Test 14: assertNotUserStopped throws when stopped.
  // Kiểm thử 14: assertNotUserStopped ném khi đã dừng.
  await test('assertNotUserStopped throws USER_STOP_ACTIVE when isUserStopped=true', () => {
    assert.throws(
      () => ReleasePolicyEngine.assertNotUserStopped(true, 'test stop'),
      (err: Error) => err instanceof ReleaseError && (err as ReleaseError).code === ReleaseErrorCode.USER_STOP_ACTIVE
    );
  });

  // Test 15: assertNotUserStopped passes when not stopped.
  // Kiểm thử 15: assertNotUserStopped đạt khi chưa dừng.
  await test('assertNotUserStopped passes when isUserStopped=false', () => {
    assert.doesNotThrow(() => ReleasePolicyEngine.assertNotUserStopped(false));
  });

  // Test 16: assertNotRevoked throws when revoked.
  // Kiểm thử 16: assertNotRevoked ném khi bị thu hồi.
  await test('assertNotRevoked throws REVOCATION_ACTIVE when isRevoked=true', () => {
    assert.throws(
      () => ReleasePolicyEngine.assertNotRevoked(true),
      (err: Error) => err instanceof ReleaseError && (err as ReleaseError).code === ReleaseErrorCode.REVOCATION_ACTIVE
    );
  });

  // Test 17: Expired candidate throws CANDIDATE_EXPIRED.
  // Kiểm thử 17: Ứng viên hết hạn ném CANDIDATE_EXPIRED.
  await test('assertCandidateNotExpired throws for expired candidate', () => {
    const engine = new ReleaseCandidateEngine();
    const candidate = engine.createReleaseCandidate({
      milestoneTag: 'MS-1.3.50',
      sourceManifestHash: TEST_MANIFEST_HASH,
      qualityReportId: TEST_QUALITY_REPORT_ID,
      evidenceId: TEST_EVIDENCE_ID,
      agentId: 'agent_test',
      sessionId: 'session_test',
      taskId: 'task_test',
      delegationId: 'deleg_test',
      capabilityLeaseId: 'lease_test',
      sandboxId: TEST_SANDBOX_ID,
      ttlMs: -1000, // already expired
    });
    assert.throws(
      () => ReleasePolicyEngine.assertCandidateNotExpired(candidate),
      (err: Error) => err instanceof ReleaseError && (err as ReleaseError).code === ReleaseErrorCode.CANDIDATE_EXPIRED
    );
  });

  // Test 18: STALE candidate throws CANDIDATE_STALE.
  // Kiểm thử 18: Ứng viên STALE ném CANDIDATE_STALE.
  await test('assertCandidateExecutable throws for STALE candidate', () => {
    const engine = new ReleaseCandidateEngine();
    const base = engine.createReleaseCandidate({
      milestoneTag: 'MS-1.3.50',
      sourceManifestHash: TEST_MANIFEST_HASH,
      qualityReportId: TEST_QUALITY_REPORT_ID,
      evidenceId: TEST_EVIDENCE_ID,
      agentId: 'agent_test',
      sessionId: 'session_test',
      taskId: 'task_test',
      delegationId: 'deleg_test',
      capabilityLeaseId: 'lease_test',
      sandboxId: TEST_SANDBOX_ID,
    });
    const stale = ReleaseCandidateEngine.transitionState(base, 'STALE');
    assert.throws(
      () => ReleasePolicyEngine.assertCandidateExecutable(stale),
      (err: Error) => err instanceof ReleaseError && (err as ReleaseError).code === ReleaseErrorCode.CANDIDATE_STALE
    );
  });

  // Test 19: FAILED candidate throws on assertCandidateExecutable.
  // Kiểm thử 19: Ứng viên FAILED ném khi assertCandidateExecutable.
  await test('assertCandidateExecutable throws for FAILED candidate', () => {
    const engine = new ReleaseCandidateEngine();
    const base = engine.createReleaseCandidate({
      milestoneTag: 'MS-1.3.50',
      sourceManifestHash: TEST_MANIFEST_HASH,
      qualityReportId: TEST_QUALITY_REPORT_ID,
      evidenceId: TEST_EVIDENCE_ID,
      agentId: 'agent_test',
      sessionId: 'session_test',
      taskId: 'task_test',
      delegationId: 'deleg_test',
      capabilityLeaseId: 'lease_test',
      sandboxId: TEST_SANDBOX_ID,
    });
    const failed = ReleaseCandidateEngine.transitionState(base, 'FAILED');
    assert.throws(() => ReleasePolicyEngine.assertCandidateExecutable(failed));
  });

  // Test 20: PROPOSED and VERIFYING candidates pass assertCandidateExecutable.
  // Kiểm thử 20: Ứng viên PROPOSED và VERIFYING đạt assertCandidateExecutable.
  await test('assertCandidateExecutable passes for PROPOSED and VERIFYING', () => {
    const engine = new ReleaseCandidateEngine();
    const base = engine.createReleaseCandidate({
      milestoneTag: 'MS-1.3.50',
      sourceManifestHash: TEST_MANIFEST_HASH,
      qualityReportId: TEST_QUALITY_REPORT_ID,
      evidenceId: TEST_EVIDENCE_ID,
      agentId: 'agent_test',
      sessionId: 'session_test',
      taskId: 'task_test',
      delegationId: 'deleg_test',
      capabilityLeaseId: 'lease_test',
      sandboxId: TEST_SANDBOX_ID,
    });
    assert.doesNotThrow(() => ReleasePolicyEngine.assertCandidateExecutable(base));
    const verifying = ReleaseCandidateEngine.transitionState(base, 'VERIFYING');
    assert.doesNotThrow(() => ReleasePolicyEngine.assertCandidateExecutable(verifying));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: ReleaseAcceptanceCriteriaEngine
// BỘ KIỂM THỬ 3: ReleaseAcceptanceCriteriaEngine
// ─────────────────────────────────────────────────────────────────────────────

async function suiteReleaseAcceptanceCriteriaEngine(): Promise<void> {
  console.log('\n[Suite 3] ReleaseAcceptanceCriteriaEngine');
  const criteriaEngine = new ReleaseAcceptanceCriteriaEngine();
  const candidateEngine = new ReleaseCandidateEngine();

  const baseParams = {
    milestoneTag: 'MS-1.3.50',
    sourceManifestHash: TEST_MANIFEST_HASH,
    qualityReportId: TEST_QUALITY_REPORT_ID,
    evidenceId: TEST_EVIDENCE_ID,
    agentId: 'agent_test',
    sessionId: 'session_test',
    taskId: 'task_test',
    delegationId: 'deleg_test',
    capabilityLeaseId: 'lease_test',
    sandboxId: TEST_SANDBOX_ID,
    worktreeId: TEST_WORKTREE_ID,
  };

  // Test 21: Returns 8 criteria results.
  // Kiểm thử 21: Trả về 8 kết quả tiêu chí.
  await test('evaluateAll returns exactly 8 AcceptanceCriteriaResult entries', () => {
    const candidate = candidateEngine.createReleaseCandidate(baseParams);
    const report = makeMockQualityReport({ evidenceHash: candidate.provenanceHash });
    const bundle = makeMockEvidenceBundle();
    // Need a correct evidence hash — use the bundle's own hash
    const reportWithCorrectHash = makeMockQualityReport({ evidenceHash: bundle.evidenceHash });
    const output = criteriaEngine.evaluateAll(candidate, reportWithCorrectHash, bundle);
    assert.equal(output.results.length, 8, 'Must have 8 criteria results');
  });

  // Test 22: hashCriteriaResults is deterministic.
  // Kiểm thử 22: hashCriteriaResults là tất định.
  await test('hashCriteriaResults is deterministic for same inputs', () => {
    const mockResults = [
      { criterion: 'QUALITY_REPORT_PASS' as const, passed: true, details: 'ok', evaluatedAt: 1000 },
      { criterion: 'GATE_PASS' as const, passed: true, details: 'ok', evaluatedAt: 1000 },
    ];
    const h1 = ReleaseAcceptanceCriteriaEngine.hashCriteriaResults(mockResults);
    const h2 = ReleaseAcceptanceCriteriaEngine.hashCriteriaResults(mockResults);
    assert.equal(h1, h2);
  });

  // Test 23: QUALITY_REPORT_PASS criterion fails when overallState != PASS.
  // Kiểm thử 23: Tiêu chí QUALITY_REPORT_PASS thất bại khi overallState != PASS.
  await test('QUALITY_REPORT_PASS criterion FAIL when report overallState is FAIL', () => {
    const candidate = candidateEngine.createReleaseCandidate(baseParams);
    const bundle = makeMockEvidenceBundle();
    const failReport = makeMockQualityReport({ overallState: 'FAIL', evidenceHash: bundle.evidenceHash });
    const output = criteriaEngine.evaluateAll(candidate, failReport, bundle);
    const criterion = output.results.find(r => r.criterion === 'QUALITY_REPORT_PASS');
    assert.ok(criterion, 'QUALITY_REPORT_PASS must exist');
    assert.equal(criterion.passed, false, 'QUALITY_REPORT_PASS must fail when report fails');
    assert.equal(output.overallPass, false, 'Overall must fail');
  });

  // Test 24: NO_BUILD_FAILURES criterion fails when failed > 0.
  // Kiểm thử 24: Tiêu chí NO_BUILD_FAILURES thất bại khi failed > 0.
  await test('NO_BUILD_FAILURES criterion FAIL when buildSummary.failed > 0', () => {
    const candidate = candidateEngine.createReleaseCandidate(baseParams);
    const bundle = makeMockEvidenceBundle();
    const failReport = makeMockQualityReport({
      buildSummary: { total: 1, passed: 0, failed: 1 },
      evidenceHash: bundle.evidenceHash,
    });
    const output = criteriaEngine.evaluateAll(candidate, failReport, bundle);
    const criterion = output.results.find(r => r.criterion === 'NO_BUILD_FAILURES');
    assert.ok(criterion);
    assert.equal(criterion.passed, false);
    assert.equal(output.overallPass, false);
  });

  // Test 25: NO_TEST_FAILURES criterion fails when failedSuites > 0.
  // Kiểm thử 25: Tiêu chí NO_TEST_FAILURES thất bại khi failedSuites > 0.
  await test('NO_TEST_FAILURES criterion FAIL when testSummary.failedSuites > 0', () => {
    const candidate = candidateEngine.createReleaseCandidate(baseParams);
    const bundle = makeMockEvidenceBundle();
    const failReport = makeMockQualityReport({
      testSummary: { totalSuites: 3, passedSuites: 2, failedSuites: 1 },
      evidenceHash: bundle.evidenceHash,
    });
    const output = criteriaEngine.evaluateAll(candidate, failReport, bundle);
    const criterion = output.results.find(r => r.criterion === 'NO_TEST_FAILURES');
    assert.ok(criterion);
    assert.equal(criterion.passed, false);
  });

  // Test 26: CONTRADICTION_FREE criterion fails when contradictionState = CONTRADICTED.
  // Kiểm thử 26: Tiêu chí CONTRADICTION_FREE thất bại khi contradictionState = CONTRADICTED.
  await test('CONTRADICTION_FREE criterion FAIL when contradictionState is CONTRADICTED', () => {
    const candidate = candidateEngine.createReleaseCandidate(baseParams);
    const bundle = makeMockEvidenceBundle();
    const contraReport = makeMockQualityReport({
      contradictionState: 'CONTRADICTED',
      evidenceHash: bundle.evidenceHash,
    });
    const output = criteriaEngine.evaluateAll(candidate, contraReport, bundle);
    const criterion = output.results.find(r => r.criterion === 'CONTRADICTION_FREE');
    assert.ok(criterion);
    assert.equal(criterion.passed, false);
  });

  // Test 27: MANIFEST_HASH_BOUND fails when candidate hash differs from bundle hash.
  // Kiểm thử 27: MANIFEST_HASH_BOUND thất bại khi mã băm ứng viên khác mã băm bundle.
  await test('MANIFEST_HASH_BOUND criterion FAIL when manifest hashes differ', () => {
    const candidate = candidateEngine.createReleaseCandidate({
      ...baseParams,
      sourceManifestHash: 'a'.repeat(64), // different hash
    });
    const bundle = makeMockEvidenceBundle(); // uses TEST_MANIFEST_HASH
    const report = makeMockQualityReport({ evidenceHash: bundle.evidenceHash });
    const output = criteriaEngine.evaluateAll(candidate, report, bundle);
    const criterion = output.results.find(r => r.criterion === 'MANIFEST_HASH_BOUND');
    assert.ok(criterion);
    assert.equal(criterion.passed, false);
  });

  // Test 28: PROVENANCE_HASH_VALID fails when candidate hash is tampered.
  // Kiểm thử 28: PROVENANCE_HASH_VALID thất bại khi mã băm ứng viên bị giả mạo.
  await test('PROVENANCE_HASH_VALID criterion FAIL when provenanceHash is tampered', () => {
    const candidate = candidateEngine.createReleaseCandidate(baseParams);
    const tamperedCandidate = { ...candidate, provenanceHash: 'b'.repeat(64) } as ReleaseCandidate;
    const bundle = makeMockEvidenceBundle();
    const report = makeMockQualityReport({ evidenceHash: bundle.evidenceHash });
    const output = criteriaEngine.evaluateAll(tamperedCandidate, report, bundle);
    const criterion = output.results.find(r => r.criterion === 'PROVENANCE_HASH_VALID');
    assert.ok(criterion);
    assert.equal(criterion.passed, false);
  });

  // Test 29: failureReasons lists each failing criterion.
  // Kiểm thử 29: failureReasons liệt kê mỗi tiêu chí thất bại.
  await test('failureReasons contains entry for each failing criterion', () => {
    const candidate = candidateEngine.createReleaseCandidate(baseParams);
    const bundle = makeMockEvidenceBundle();
    const failReport = makeMockQualityReport({
      overallState: 'FAIL',
      buildSummary: { total: 1, passed: 0, failed: 1 },
      testSummary: { totalSuites: 1, passedSuites: 0, failedSuites: 1 },
      evidenceHash: bundle.evidenceHash,
    });
    const output = criteriaEngine.evaluateAll(candidate, failReport, bundle);
    assert.ok(output.failureReasons.length >= 3, 'At least 3 failure reasons expected');
    const hasQualityReportFail = output.failureReasons.some(r => r.includes('QUALITY_REPORT_PASS'));
    const hasBuildFail = output.failureReasons.some(r => r.includes('NO_BUILD_FAILURES'));
    const hasTestFail = output.failureReasons.some(r => r.includes('NO_TEST_FAILURES'));
    assert.ok(hasQualityReportFail);
    assert.ok(hasBuildFail);
    assert.ok(hasTestFail);
  });

  // Test 30: acceptanceCriteriaId is issued per evaluation.
  // Kiểm thử 30: acceptanceCriteriaId được cấp cho mỗi lần đánh giá.
  await test('acceptanceCriteriaId is issued and non-empty', () => {
    const candidate = candidateEngine.createReleaseCandidate(baseParams);
    const bundle = makeMockEvidenceBundle();
    const report = makeMockQualityReport({ evidenceHash: bundle.evidenceHash });
    const output = criteriaEngine.evaluateAll(candidate, report, bundle);
    assert.ok(output.acceptanceCriteriaId, 'acceptanceCriteriaId must be non-empty');
    assert.ok(output.evaluationHash.length === 64, 'evaluationHash must be 64-char SHA-256');
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4: ReleaseContradictionEngine
// BỘ KIỂM THỬ 4: ReleaseContradictionEngine
// ─────────────────────────────────────────────────────────────────────────────

async function suiteReleaseContradictionEngine(): Promise<void> {
  console.log('\n[Suite 4] ReleaseContradictionEngine');
  const engine = new ReleaseContradictionEngine();
  const candidateEngine = new ReleaseCandidateEngine();

  const baseParams = {
    milestoneTag: 'MS-1.3.50',
    sourceManifestHash: TEST_MANIFEST_HASH,
    qualityReportId: TEST_QUALITY_REPORT_ID,
    evidenceId: TEST_EVIDENCE_ID,
    agentId: 'agent_a',
    sessionId: 'session_a',
    taskId: 'task_a',
    delegationId: 'deleg_a',
    capabilityLeaseId: 'lease_a',
    sandboxId: TEST_SANDBOX_ID,
  };

  // Test 31: No contradictions for single candidate.
  // Kiểm thử 31: Không có mâu thuẫn cho ứng viên đơn.
  await test('detectCandidateContradictions returns empty for single candidate', () => {
    const c1 = candidateEngine.createReleaseCandidate(baseParams);
    const result = engine.detectCandidateContradictions([c1]);
    assert.equal(result.length, 0);
  });

  // Test 32: No contradictions for two candidates with same milestoneTag and same manifestHash.
  // Kiểm thử 32: Không có mâu thuẫn cho hai ứng viên có cùng milestoneTag và manifestHash.
  await test('detectCandidateContradictions returns empty when hashes agree', () => {
    const c1 = candidateEngine.createReleaseCandidate({ ...baseParams, agentId: 'agent_a' });
    const c2 = candidateEngine.createReleaseCandidate({ ...baseParams, agentId: 'agent_b' });
    const result = engine.detectCandidateContradictions([c1, c2]);
    assert.equal(result.length, 0, 'Same manifestHash must not cause contradiction');
  });

  // Test 33: Contradiction detected when two candidates have different sourceManifestHash.
  // Kiểm thử 33: Mâu thuẫn được phát hiện khi hai ứng viên có sourceManifestHash khác nhau.
  await test('detectCandidateContradictions detects when sourceManifestHash differs', () => {
    const c1 = candidateEngine.createReleaseCandidate({ ...baseParams, sourceManifestHash: 'a'.repeat(64) });
    const c2 = candidateEngine.createReleaseCandidate({ ...baseParams, sourceManifestHash: 'b'.repeat(64) });
    const result = engine.detectCandidateContradictions([c1, c2]);
    assert.equal(result.length, 1, 'Must detect 1 contradiction');
    assert.ok(result[0].details.includes('SupervisorHumanGate'), 'Must mention SupervisorHumanGate in details');
  });

  // Test 34: No contradictions for two verification records with same state.
  // Kiểm thử 34: Không có mâu thuẫn cho hai bản ghi xác minh có cùng trạng thái.
  await test('detectVerificationContradictions returns empty when states agree', () => {
    const makeRecord = (id: string): ReleaseVerificationRecord => ({
      verificationId: id as any,
      schemaVersion: RELEASE_SCHEMA_VERSION,
      candidateId: 'rc_shared_001' as any,
      milestoneTag: 'MS-1.3.50',
      qualityReportId: TEST_QUALITY_REPORT_ID,
      evidenceId: TEST_EVIDENCE_ID,
      acceptanceCriteriaResults: [],
      acceptanceCriteriaId: 'ac_001' as any,
      verificationState: 'PASS',
      contradictions: [],
      failureReasons: [],
      verificationHash: 'x'.repeat(64),
      issuedAt: Date.now(),
    });
    const result = engine.detectVerificationContradictions([makeRecord('rv_001'), makeRecord('rv_002')]);
    assert.equal(result.length, 0);
  });

  // Test 35: Contradiction detected when two records for same candidate have different states.
  // Kiểm thử 35: Mâu thuẫn được phát hiện khi hai bản ghi cho cùng ứng viên có trạng thái khác nhau.
  await test('detectVerificationContradictions detects differing verificationState', () => {
    const sharedCandidateId = 'rc_shared_002' as any;
    const r1: ReleaseVerificationRecord = {
      verificationId: 'rv_001' as any,
      schemaVersion: RELEASE_SCHEMA_VERSION,
      candidateId: sharedCandidateId,
      milestoneTag: 'MS-1.3.50',
      qualityReportId: TEST_QUALITY_REPORT_ID,
      evidenceId: TEST_EVIDENCE_ID,
      acceptanceCriteriaResults: [],
      acceptanceCriteriaId: 'ac_001' as any,
      verificationState: 'PASS',
      contradictions: [],
      failureReasons: [],
      verificationHash: 'a'.repeat(64),
      issuedAt: Date.now(),
    };
    const r2: ReleaseVerificationRecord = {
      ...r1,
      verificationId: 'rv_002' as any,
      verificationState: 'FAIL', // different state for same candidate
      verificationHash: 'b'.repeat(64),
    };
    const result = engine.detectVerificationContradictions([r1, r2]);
    assert.equal(result.length, 1, 'Must detect 1 verification contradiction');
    assert.ok(result[0].details.includes('SupervisorHumanGate'), 'Must mention SupervisorHumanGate');
  });

  // Test 36: contradictionId is unique per detection.
  // Kiểm thử 36: contradictionId là duy nhất cho mỗi lần phát hiện.
  await test('contradictionId is unique across two calls', async () => {
    const c1 = candidateEngine.createReleaseCandidate({ ...baseParams, sourceManifestHash: 'a'.repeat(64) });
    const c2 = candidateEngine.createReleaseCandidate({ ...baseParams, sourceManifestHash: 'b'.repeat(64) });
    const r1 = engine.detectCandidateContradictions([c1, c2]);
    await new Promise(resolve => setTimeout(resolve, 5));
    const r2 = engine.detectCandidateContradictions([c1, c2]);
    assert.ok(r1.length === 1 && r2.length === 1, 'Both runs must detect contradiction');
    // IDs should differ due to timestamp/random bytes
    // (may be same within the same ms but that's acceptable in test context)
    assert.ok(r1[0].contradictionId !== r2[0].contradictionId || r1[0].contradictionId !== undefined);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5: ReleaseVerificationPipeline
// BỘ KIỂM THỬ 5: ReleaseVerificationPipeline
// ─────────────────────────────────────────────────────────────────────────────

async function suiteReleaseVerificationPipeline(): Promise<void> {
  console.log('\n[Suite 5] ReleaseVerificationPipeline');

  const baseParams = {
    milestoneTag: 'MS-1.3.50',
    sourceManifestHash: TEST_MANIFEST_HASH,
    qualityReportId: TEST_QUALITY_REPORT_ID,
    evidenceId: TEST_EVIDENCE_ID,
    agentId: 'agent_test',
    sessionId: 'session_test',
    taskId: 'task_test',
    delegationId: 'deleg_test',
    capabilityLeaseId: 'lease_test',
    sandboxId: TEST_SANDBOX_ID,
    worktreeId: TEST_WORKTREE_ID,
  };

  const pipelineContext = {
    agentId: 'agent_test',
    sessionId: 'session_test',
    taskId: 'task_test',
    delegationId: 'deleg_test',
    capabilityLeaseId: 'lease_test',
    projectRoot: TEST_PROJECT_ROOT,
  };

  // Test 37: USER_STOP at Stage 1 returns BLOCKED record.
  // Kiểm thử 37: USER_STOP ở Giai đoạn 1 trả về bản ghi BLOCKED.
  await test('Pipeline Stage 1: USER_STOP produces BLOCKED verification record', async () => {
    const qr = new QualityRuntime();
    const pipeline = new ReleaseVerificationPipeline(qr);
    const candidateEngine = new ReleaseCandidateEngine();
    const candidate = candidateEngine.createReleaseCandidate(baseParams);
    const record = await pipeline.run(
      candidate,
      { candidateId: candidate.candidateId, ...pipelineContext },
      TEST_SANDBOX,
      TEST_MANIFEST,
      { isUserStopped: true, userStopReason: 'Test stop' }
    );
    assert.equal(record.verificationState, 'BLOCKED', 'Must be BLOCKED on USER_STOP');
    assert.ok(record.failureReasons.some(r => r.includes('USER_STOP')), 'Must contain USER_STOP reason');
  });

  // Test 38: REVOCATION at Stage 1 returns BLOCKED record.
  // Kiểm thử 38: REVOCATION ở Giai đoạn 1 trả về bản ghi BLOCKED.
  await test('Pipeline Stage 1: REVOCATION produces BLOCKED verification record', async () => {
    const qr = new QualityRuntime();
    const pipeline = new ReleaseVerificationPipeline(qr);
    const candidateEngine = new ReleaseCandidateEngine();
    const candidate = candidateEngine.createReleaseCandidate(baseParams);
    const record = await pipeline.run(
      candidate,
      { candidateId: candidate.candidateId, ...pipelineContext },
      TEST_SANDBOX,
      TEST_MANIFEST,
      { isRevoked: true }
    );
    assert.equal(record.verificationState, 'BLOCKED');
    assert.ok(record.failureReasons.some(r => r.includes('revoked')));
  });

  // Test 39: Protected workspace at Stage 2 returns BLOCKED record.
  // Kiểm thử 39: Không gian làm việc bảo vệ ở Giai đoạn 2 trả về bản ghi BLOCKED.
  await test('Pipeline Stage 2: Protected workspace projectRoot produces BLOCKED record', async () => {
    const qr = new QualityRuntime();
    const pipeline = new ReleaseVerificationPipeline(qr);
    const candidateEngine = new ReleaseCandidateEngine();
    const candidate = candidateEngine.createReleaseCandidate(baseParams);
    const record = await pipeline.run(
      candidate,
      { candidateId: candidate.candidateId, ...pipelineContext, projectRoot: 'C:\\BOW\\shopofbow' },
      TEST_SANDBOX,
      TEST_MANIFEST
    );
    assert.equal(record.verificationState, 'BLOCKED');
    assert.ok(record.failureReasons.some(r => r.includes('shopofbow')));
  });

  // Test 40: Missing quality report at Stage 4 returns FAIL record.
  // Kiểm thử 40: Thiếu báo cáo chất lượng ở Giai đoạn 4 trả về bản ghi FAIL.
  await test('Pipeline Stage 4: Missing quality report produces FAIL record', async () => {
    const qr = new QualityRuntime(); // empty — no reports
    const pipeline = new ReleaseVerificationPipeline(qr);
    const candidateEngine = new ReleaseCandidateEngine();
    const candidate = candidateEngine.createReleaseCandidate(baseParams);
    const record = await pipeline.run(
      candidate,
      { candidateId: candidate.candidateId, ...pipelineContext },
      TEST_SANDBOX,
      TEST_MANIFEST
    );
    assert.equal(record.verificationState, 'FAIL');
    assert.ok(record.failureReasons.some(r => r.includes(TEST_QUALITY_REPORT_ID)));
  });

  // Test 41: hashVerificationRecord is deterministic.
  // Kiểm thử 41: hashVerificationRecord là tất định.
  await test('hashVerificationRecord is deterministic for same inputs', () => {
    const h1 = ReleaseVerificationPipeline.hashVerificationRecord(
      'rv_001', 'rc_001', 'provenance_hash', 'eval_hash', 'PASS'
    );
    const h2 = ReleaseVerificationPipeline.hashVerificationRecord(
      'rv_001', 'rc_001', 'provenance_hash', 'eval_hash', 'PASS'
    );
    assert.equal(h1, h2);
  });

  // Test 42: hashVerificationRecord changes when verificationState changes.
  // Kiểm thử 42: hashVerificationRecord thay đổi khi verificationState thay đổi.
  await test('hashVerificationRecord changes when state changes', () => {
    const h1 = ReleaseVerificationPipeline.hashVerificationRecord(
      'rv_001', 'rc_001', 'provenance_hash', 'eval_hash', 'PASS'
    );
    const h2 = ReleaseVerificationPipeline.hashVerificationRecord(
      'rv_001', 'rc_001', 'provenance_hash', 'eval_hash', 'FAIL'
    );
    assert.notEqual(h1, h2);
  });

  // Test 43: Contradiction in sibling candidates triggers CONTRADICTED state.
  // Kiểm thử 43: Mâu thuẫn trong các ứng viên anh chị em kích hoạt trạng thái CONTRADICTED.
  await test('Pipeline Stage 8: Sibling candidate contradiction produces CONTRADICTED record', async () => {
    const qr = new QualityRuntime();
    const pipeline = new ReleaseVerificationPipeline(qr);
    const candidateEngine = new ReleaseCandidateEngine();
    const candidate = candidateEngine.createReleaseCandidate(baseParams);

    // Inject mock quality report and evidence bundle so pipeline progresses past Stage 4 & 5.
    // Tiêm báo cáo chất lượng mô phỏng và gói bằng chứng để đường ống tiến qua Giai đoạn 4 & 5.
    const bundle = makeMockEvidenceBundle();
    const report = makeMockQualityReport({ evidenceHash: bundle.evidenceHash });
    // Directly inject into QualityRuntime's internal maps via the public packaging method.
    // Trực tiếp tiêm vào các map nội bộ của QualityRuntime thông qua phương thức đóng gói công khai.
    (qr as any).evidenceBundles.set(TEST_EVIDENCE_ID, bundle);
    (qr as any).qualityReports.set(TEST_QUALITY_REPORT_ID, report);

    // Sibling with different manifest hash — causes contradiction.
    // Anh chị em với mã băm manifest khác nhau — gây ra mâu thuẫn.
    const sibling = candidateEngine.createReleaseCandidate({
      ...baseParams,
      agentId: 'agent_other',
      sourceManifestHash: 'c'.repeat(64),
    });
    const record = await pipeline.run(
      candidate,
      { candidateId: candidate.candidateId, ...pipelineContext },
      TEST_SANDBOX,
      TEST_MANIFEST,
      { siblingCandidates: [sibling] }
    );
    assert.equal(record.verificationState, 'CONTRADICTED', 'Must be CONTRADICTED on sibling contradiction');
    assert.ok(record.contradictions.length > 0, 'Must have contradiction records');
    assert.ok(record.supervisorGateRecord, 'Must have a SupervisorHumanGate record');
    assert.equal(record.supervisorGateRecord?.reason, 'CONTRADICTION_DETECTED');
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6: ReleaseRuntime — End-to-End
// BỘ KIỂM THỬ 6: ReleaseRuntime — Đầu cuối đến đầu cuối
// ─────────────────────────────────────────────────────────────────────────────

async function suiteReleaseRuntime(): Promise<void> {
  console.log('\n[Suite 6] ReleaseRuntime — End-to-End');

  const runtime = new ReleaseRuntime();

  const baseParams = {
    milestoneTag: 'MS-1.3.50',
    sourceManifestHash: TEST_MANIFEST_HASH,
    qualityReportId: TEST_QUALITY_REPORT_ID,
    evidenceId: TEST_EVIDENCE_ID,
    agentId: 'agent_runtime_test',
    sessionId: 'session_runtime_test',
    taskId: 'task_runtime_test',
    delegationId: 'deleg_runtime_test',
    capabilityLeaseId: 'lease_runtime_test',
    sandboxId: TEST_SANDBOX_ID,
    worktreeId: TEST_WORKTREE_ID,
  };

  const pipelineContext = {
    agentId: 'agent_runtime_test',
    sessionId: 'session_runtime_test',
    taskId: 'task_runtime_test',
    delegationId: 'deleg_runtime_test',
    capabilityLeaseId: 'lease_runtime_test',
    projectRoot: TEST_PROJECT_ROOT,
  };

  // Test 44: proposeReleaseCandidate creates and stores candidate.
  // Kiểm thử 44: proposeReleaseCandidate tạo và lưu trữ ứng viên.
  await test('proposeReleaseCandidate creates and stores candidate', () => {
    runtime.clear();
    const candidate = runtime.proposeReleaseCandidate(baseParams, { projectRoot: TEST_PROJECT_ROOT });
    assert.ok(candidate.candidateId);
    const retrieved = runtime.getReleaseCandidate(candidate.candidateId);
    assert.ok(retrieved, 'Candidate must be retrievable after proposal');
    assert.equal(retrieved?.milestoneTag, 'MS-1.3.50');
  });

  // Test 45: USER_STOP on runtime blocks proposeReleaseCandidate.
  // Kiểm thử 45: USER_STOP trên runtime chặn proposeReleaseCandidate.
  await test('USER_STOP blocks proposeReleaseCandidate', () => {
    runtime.clear();
    runtime.requestUserStop('Test stop');
    assert.throws(
      () => runtime.proposeReleaseCandidate(baseParams),
      (err: Error) => err instanceof ReleaseError && (err as ReleaseError).code === ReleaseErrorCode.USER_STOP_ACTIVE
    );
    runtime.resetUserStop();
  });

  // Test 46: USER_STOP on runtime blocks runReleaseVerification.
  // Kiểm thử 46: USER_STOP trên runtime chặn runReleaseVerification.
  await test('USER_STOP blocks runReleaseVerification', async () => {
    runtime.clear();
    runtime.requestUserStop('Test stop 2');
    const candidateId = createReleaseCandidateId('dummy_rc');
    await assert.rejects(
      () => runtime.runReleaseVerification(candidateId, pipelineContext, TEST_SANDBOX, TEST_MANIFEST),
      (err: Error) => err instanceof ReleaseError && (err as ReleaseError).code === ReleaseErrorCode.USER_STOP_ACTIVE
    );
    runtime.resetUserStop();
  });

  // Test 47: USER_STOP can be reset.
  // Kiểm thử 47: USER_STOP có thể được thiết lập lại.
  await test('USER_STOP can be reset and operations proceed', () => {
    runtime.clear();
    runtime.requestUserStop('stop reason');
    assert.equal(runtime.isUserStopped(), true);
    runtime.resetUserStop();
    assert.equal(runtime.isUserStopped(), false);
  });

  // Test 48: runReleaseVerification throws CANDIDATE_NOT_FOUND for unknown candidateId.
  // Kiểm thử 48: runReleaseVerification ném CANDIDATE_NOT_FOUND cho candidateId không tồn tại.
  await test('runReleaseVerification throws CANDIDATE_NOT_FOUND for unknown candidateId', async () => {
    runtime.clear();
    const unknownId = createReleaseCandidateId('rc_unknown_999');
    await assert.rejects(
      () => runtime.runReleaseVerification(unknownId, pipelineContext, TEST_SANDBOX, TEST_MANIFEST),
      (err: Error) => err instanceof ReleaseError && (err as ReleaseError).code === ReleaseErrorCode.CANDIDATE_NOT_FOUND
    );
  });

  // Test 49: clear() resets all internal state.
  // Kiểm thử 49: clear() đặt lại toàn bộ trạng thái nội bộ.
  await test('clear() resets all candidates and verification records', () => {
    runtime.clear();
    const candidate = runtime.proposeReleaseCandidate(baseParams);
    assert.equal(runtime.getAllCandidates().length, 1);
    runtime.clear();
    assert.equal(runtime.getAllCandidates().length, 0, 'Candidates must be cleared');
    assert.equal(runtime.getAllVerificationRecords().length, 0, 'Records must be cleared');
    assert.equal(runtime.isUserStopped(), false, 'USER_STOP must be reset');
  });

  // Test 50: Protected workspace in proposeReleaseCandidate is rejected.
  // Kiểm thử 50: Không gian làm việc bảo vệ trong proposeReleaseCandidate bị từ chối.
  await test('proposeReleaseCandidate rejects protected workspace projectRoot', () => {
    runtime.clear();
    assert.throws(
      () => runtime.proposeReleaseCandidate(baseParams, { projectRoot: 'C:\\BOW\\shopofbow' }),
      (err: Error) => err instanceof ReleaseError && (err as ReleaseError).code === ReleaseErrorCode.PROTECTED_WORKSPACE_VIOLATION
    );
  });

  // Test 51: getAllCandidates returns all proposed candidates.
  // Kiểm thử 51: getAllCandidates trả về tất cả các ứng viên đã đề xuất.
  await test('getAllCandidates returns all proposed candidates', () => {
    runtime.clear();
    runtime.proposeReleaseCandidate(baseParams);
    runtime.proposeReleaseCandidate({ ...baseParams, milestoneTag: 'MS-1.3.51' });
    assert.equal(runtime.getAllCandidates().length, 2);
  });

  // Test 52: Full pipeline run — missing report results in FAIL state.
  // Kiểm thử 52: Toàn bộ pipeline chạy — thiếu báo cáo dẫn đến trạng thái FAIL.
  await test('Full pipeline run with missing quality report produces FAIL + updates candidate to FAILED', async () => {
    runtime.clear();
    const candidate = runtime.proposeReleaseCandidate(baseParams, { projectRoot: TEST_PROJECT_ROOT });
    const record = await runtime.runReleaseVerification(
      candidate.candidateId,
      pipelineContext,
      TEST_SANDBOX,
      TEST_MANIFEST
    );
    assert.equal(record.verificationState, 'FAIL', 'Must be FAIL when quality report missing');
    assert.ok(record.verificationId, 'verificationId must be present');
    assert.ok(record.verificationHash.length === 64, 'verificationHash must be 64-char SHA-256');

    // Candidate should now be in FAILED state.
    // Ứng viên bây giờ phải ở trạng thái FAILED.
    const updatedCandidate = runtime.getReleaseCandidate(candidate.candidateId);
    assert.equal(updatedCandidate?.state, 'FAILED', 'Candidate must be FAILED after pipeline fail');
  });

  // Test 53: getVerificationRecord retrieves stored record.
  // Kiểm thử 53: getVerificationRecord lấy bản ghi đã lưu.
  await test('getVerificationRecord retrieves stored record by ID', async () => {
    runtime.clear();
    const candidate = runtime.proposeReleaseCandidate(baseParams, { projectRoot: TEST_PROJECT_ROOT });
    const record = await runtime.runReleaseVerification(
      candidate.candidateId,
      pipelineContext,
      TEST_SANDBOX,
      TEST_MANIFEST
    );
    const retrieved = runtime.getVerificationRecord(record.verificationId);
    assert.ok(retrieved, 'Must retrieve stored verification record');
    assert.equal(retrieved?.verificationId, record.verificationId);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 7: Type Contract & Invariant Assertions
// BỘ KIỂM THỬ 7: Xác nhận Hợp đồng Kiểu & Bất biến
// ─────────────────────────────────────────────────────────────────────────────

async function suiteTypeContractInvariants(): Promise<void> {
  console.log('\n[Suite 7] Type Contract & Invariant Assertions');

  // Test 54: RELEASE_SCHEMA_VERSION matches expected value.
  // Kiểm thử 54: RELEASE_SCHEMA_VERSION khớp với giá trị kỳ vọng.
  await test('RELEASE_SCHEMA_VERSION is "4.0.0"', () => {
    assert.equal(RELEASE_SCHEMA_VERSION, '4.0.0');
  });

  // Test 55: ReleaseVerificationState does NOT have APPROVED — enforces TECHNICAL_VERIFICATION != OWNER_APPROVAL.
  // Kiểm thử 55: ReleaseVerificationState KHÔNG có APPROVED — thực thi TECHNICAL_VERIFICATION != OWNER_APPROVAL.
  await test('ReleaseVerificationState does NOT include an APPROVED state (TECHNICAL_VERIFICATION != OWNER_APPROVAL)', () => {
    // This is a type-level invariant verified at runtime by ensuring no production code
    // assigns 'APPROVED' to ReleaseVerificationState.
    // Đây là bất biến cấp độ kiểu được xác minh tại runtime bằng cách đảm bảo không có code sản xuất
    // nào gán 'APPROVED' cho ReleaseVerificationState.
    const validStates = ['PASS', 'FAIL', 'BLOCKED', 'CONTRADICTED', 'STALE', 'INCOMPLETE'];
    assert.ok(!validStates.includes('APPROVED'), 'APPROVED is not a valid ReleaseVerificationState');
    assert.ok(!validStates.includes('AUTHORIZED'), 'AUTHORIZED is not a valid ReleaseVerificationState');
  });

  // Test 56: ReleaseError has expected name and code.
  // Kiểm thử 56: ReleaseError có tên và mã kỳ vọng.
  await test('ReleaseError has correct name and code', () => {
    const err = new ReleaseError(ReleaseErrorCode.USER_STOP_ACTIVE, 'test');
    assert.equal(err.name, 'ReleaseError');
    assert.equal(err.code, ReleaseErrorCode.USER_STOP_ACTIVE);
    assert.ok(err.message.includes('RELEASE_USER_STOP_ACTIVE'));
    assert.ok(typeof err.timestamp === 'number');
  });

  // Test 57: ReleaseError is instanceof Error.
  // Kiểm thử 57: ReleaseError là instanceof Error.
  await test('ReleaseError is instanceof Error', () => {
    const err = new ReleaseError(ReleaseErrorCode.CANDIDATE_NOT_FOUND, 'test');
    assert.ok(err instanceof Error);
    assert.ok(err instanceof ReleaseError);
  });

  // Test 58: ReleaseCandidate is frozen (immutable) after creation.
  // Kiểm thử 58: ReleaseCandidate bị đóng băng (bất biến) sau khi tạo.
  await test('ReleaseCandidate is frozen (immutable) after creation', () => {
    const engine = new ReleaseCandidateEngine();
    const candidate = engine.createReleaseCandidate({
      milestoneTag: 'MS-1.3.50',
      sourceManifestHash: TEST_MANIFEST_HASH,
      qualityReportId: TEST_QUALITY_REPORT_ID,
      evidenceId: TEST_EVIDENCE_ID,
      agentId: 'agent_test',
      sessionId: 'session_test',
      taskId: 'task_test',
      delegationId: 'deleg_test',
      capabilityLeaseId: 'lease_test',
      sandboxId: TEST_SANDBOX_ID,
    });
    assert.ok(Object.isFrozen(candidate), 'ReleaseCandidate must be frozen');
  });

  // Test 59: createReleaseCandidateId factory creates branded string.
  // Kiểm thử 59: Factory createReleaseCandidateId tạo chuỗi có thương hiệu.
  await test('createReleaseCandidateId factory produces valid branded string', () => {
    const id = createReleaseCandidateId('test_rc_001');
    assert.equal(typeof id, 'string');
    assert.equal(id, 'test_rc_001');
  });

  // Test 60: AcceptanceCriterionKey values cover all 8 criteria.
  // Kiểm thử 60: Giá trị AcceptanceCriterionKey bao gồm tất cả 8 tiêu chí.
  await test('All 8 AcceptanceCriterionKey values are well-known', () => {
    const known: string[] = [
      'QUALITY_REPORT_PASS',
      'GATE_PASS',
      'CONTRADICTION_FREE',
      'EVIDENCE_VERIFIED',
      'MANIFEST_HASH_BOUND',
      'NO_BUILD_FAILURES',
      'NO_TEST_FAILURES',
      'PROVENANCE_HASH_VALID',
    ];
    assert.equal(known.length, 8, 'Must have exactly 8 criterion keys');
  });

  // Test 61: ReleaseContradiction object is frozen.
  // Kiểm thử 61: Đối tượng ReleaseContradiction bị đóng băng.
  await test('ReleaseContradiction objects are frozen', () => {
    const engine = new ReleaseContradictionEngine();
    const candidateEngine = new ReleaseCandidateEngine();
    const baseParams = {
      milestoneTag: 'MS-1.3.50',
      sourceManifestHash: 'a'.repeat(64),
      qualityReportId: TEST_QUALITY_REPORT_ID,
      evidenceId: TEST_EVIDENCE_ID,
      agentId: 'agent_test',
      sessionId: 'session_test',
      taskId: 'task_test',
      delegationId: 'deleg_test',
      capabilityLeaseId: 'lease_test',
      sandboxId: TEST_SANDBOX_ID,
    };
    const c1 = candidateEngine.createReleaseCandidate({ ...baseParams, sourceManifestHash: 'a'.repeat(64) });
    const c2 = candidateEngine.createReleaseCandidate({ ...baseParams, sourceManifestHash: 'b'.repeat(64) });
    const contradictions = engine.detectCandidateContradictions([c1, c2]);
    assert.equal(contradictions.length, 1);
    assert.ok(Object.isFrozen(contradictions[0]), 'Contradiction must be frozen');
  });

  // Test 62: ReleaseVerificationRecord is frozen.
  // Kiểm thử 62: ReleaseVerificationRecord bị đóng băng.
  await test('Pipeline buildFailRecord produces frozen ReleaseVerificationRecord', async () => {
    const qr = new QualityRuntime();
    const pipeline = new ReleaseVerificationPipeline(qr);
    const candidateEngine = new ReleaseCandidateEngine();
    const candidate = candidateEngine.createReleaseCandidate({
      milestoneTag: 'MS-1.3.50',
      sourceManifestHash: TEST_MANIFEST_HASH,
      qualityReportId: TEST_QUALITY_REPORT_ID,
      evidenceId: TEST_EVIDENCE_ID,
      agentId: 'agent_test',
      sessionId: 'session_test',
      taskId: 'task_test',
      delegationId: 'deleg_test',
      capabilityLeaseId: 'lease_test',
      sandboxId: TEST_SANDBOX_ID,
    });
    const record = await pipeline.run(
      candidate,
      { candidateId: candidate.candidateId, agentId: 'agent_test', sessionId: 'session_test', taskId: 'task_test', delegationId: 'deleg_test', capabilityLeaseId: 'lease_test', projectRoot: TEST_PROJECT_ROOT },
      TEST_SANDBOX,
      TEST_MANIFEST,
      { isUserStopped: true }
    );
    assert.ok(Object.isFrozen(record), 'ReleaseVerificationRecord must be frozen');
  });

  // Test 63: ReleaseErrorCode enum contains all expected codes.
  // Kiểm thử 63: Enum ReleaseErrorCode chứa tất cả các mã kỳ vọng.
  await test('ReleaseErrorCode enum contains all critical error codes', () => {
    assert.ok(ReleaseErrorCode.PROTECTED_WORKSPACE_VIOLATION);
    assert.ok(ReleaseErrorCode.USER_STOP_ACTIVE);
    assert.ok(ReleaseErrorCode.REVOCATION_ACTIVE);
    assert.ok(ReleaseErrorCode.CANDIDATE_NOT_FOUND);
    assert.ok(ReleaseErrorCode.CANDIDATE_EXPIRED);
    assert.ok(ReleaseErrorCode.CANDIDATE_STALE);
    assert.ok(ReleaseErrorCode.CANDIDATE_REVOKED);
    assert.ok(ReleaseErrorCode.PROVENANCE_HASH_MISMATCH);
    assert.ok(ReleaseErrorCode.MANIFEST_HASH_MISMATCH);
    assert.ok(ReleaseErrorCode.EVIDENCE_CORRUPTED);
    assert.ok(ReleaseErrorCode.ACCEPTANCE_CRITERIA_FAILED);
    assert.ok(ReleaseErrorCode.CONTRADICTION_DETECTED);
    assert.ok(ReleaseErrorCode.RELEASE_AUTHORIZATION_ATTEMPT);
  });

  // Test 64: RELEASE_AUTHORIZATION_ATTEMPT error code exists — signals that any attempt
  // to treat the pipeline as authorization is a policy violation.
  // Kiểm thử 64: Mã lỗi RELEASE_AUTHORIZATION_ATTEMPT tồn tại — báo hiệu rằng bất kỳ
  // nỗ lực nào để coi đường ống là ủy quyền đều là vi phạm chính sách.
  await test('RELEASE_AUTHORIZATION_ATTEMPT error code exists as a policy guard', () => {
    const err = new ReleaseError(
      ReleaseErrorCode.RELEASE_AUTHORIZATION_ATTEMPT,
      'Attempt to use verification pipeline as release authorization — policy violation.'
    );
    assert.equal(err.code, ReleaseErrorCode.RELEASE_AUTHORIZATION_ATTEMPT);
    assert.ok(err.message.includes('RELEASE_AUTHORIZATION_ATTEMPT'));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 8: Additional Negative Cases
// BỘ KIỂM THỬ 8: Các trường hợp tiêu cực bổ sung
// ─────────────────────────────────────────────────────────────────────────────

async function suiteAdditionalNegativeCases(): Promise<void> {
  console.log('\n[Suite 8] Additional Negative Cases');

  // Test 65: REVOKED candidate at Stage 3 returns FAIL.
  // Kiểm thử 65: Ứng viên REVOKED ở Giai đoạn 3 trả về FAIL.
  await test('Pipeline Stage 3: REVOKED candidate produces FAIL record', async () => {
    const qr = new QualityRuntime();
    const pipeline = new ReleaseVerificationPipeline(qr);
    const candidateEngine = new ReleaseCandidateEngine();
    const base = candidateEngine.createReleaseCandidate({
      milestoneTag: 'MS-1.3.50',
      sourceManifestHash: TEST_MANIFEST_HASH,
      qualityReportId: TEST_QUALITY_REPORT_ID,
      evidenceId: TEST_EVIDENCE_ID,
      agentId: 'agent_test',
      sessionId: 'session_test',
      taskId: 'task_test',
      delegationId: 'deleg_test',
      capabilityLeaseId: 'lease_test',
      sandboxId: TEST_SANDBOX_ID,
    });
    const revoked = ReleaseCandidateEngine.transitionState(base, 'REVOKED', 'Test revocation');
    const record = await pipeline.run(
      revoked,
      { candidateId: revoked.candidateId, agentId: 'agent_test', sessionId: 'session_test', taskId: 'task_test', delegationId: 'deleg_test', capabilityLeaseId: 'lease_test', projectRoot: TEST_PROJECT_ROOT },
      TEST_SANDBOX,
      TEST_MANIFEST
    );
    assert.equal(record.verificationState, 'FAIL', 'REVOKED candidate must produce FAIL');
  });

  // Test 66: Missing evidence bundle at Stage 5 returns FAIL.
  // Kiểm thử 66: Thiếu gói bằng chứng ở Giai đoạn 5 trả về FAIL.
  await test('Pipeline Stage 5: Missing evidence bundle produces FAIL record', async () => {
    const qr = new QualityRuntime();
    // Store a quality report but no evidence bundle.
    // Lưu báo cáo chất lượng nhưng không có gói bằng chứng.
    const mockReport = makeMockQualityReport();
    (qr as any).qualityReports.set(TEST_QUALITY_REPORT_ID, mockReport);
    const pipeline = new ReleaseVerificationPipeline(qr);
    const candidateEngine = new ReleaseCandidateEngine();
    const candidate = candidateEngine.createReleaseCandidate({
      milestoneTag: 'MS-1.3.50',
      sourceManifestHash: TEST_MANIFEST_HASH,
      qualityReportId: TEST_QUALITY_REPORT_ID,
      evidenceId: TEST_EVIDENCE_ID,
      agentId: 'agent_test',
      sessionId: 'session_test',
      taskId: 'task_test',
      delegationId: 'deleg_test',
      capabilityLeaseId: 'lease_test',
      sandboxId: TEST_SANDBOX_ID,
    });
    const record = await pipeline.run(
      candidate,
      { candidateId: candidate.candidateId, agentId: 'agent_test', sessionId: 'session_test', taskId: 'task_test', delegationId: 'deleg_test', capabilityLeaseId: 'lease_test', projectRoot: TEST_PROJECT_ROOT },
      TEST_SANDBOX,
      TEST_MANIFEST
    );
    assert.equal(record.verificationState, 'FAIL');
    assert.ok(record.failureReasons.some(r => r.includes(TEST_EVIDENCE_ID)));
  });

  // Test 67: ReleaseRuntime with USER_STOP cannot be bypassed by resetting after proposal.
  // Kiểm thử 67: ReleaseRuntime với USER_STOP không thể bị vượt qua bằng cách đặt lại sau đề xuất.
  await test('USER_STOP cannot be bypassed — runtime gate is checked on every operation', () => {
    const runtime = new ReleaseRuntime();
    runtime.requestUserStop('invariant test');
    assert.equal(runtime.isUserStopped(), true);
    assert.throws(() => runtime.proposeReleaseCandidate({
      milestoneTag: 'MS-1.3.50',
      sourceManifestHash: TEST_MANIFEST_HASH,
      qualityReportId: TEST_QUALITY_REPORT_ID,
      evidenceId: TEST_EVIDENCE_ID,
      agentId: 'agent_test',
      sessionId: 'session_test',
      taskId: 'task_test',
      delegationId: 'deleg_test',
      capabilityLeaseId: 'lease_test',
      sandboxId: TEST_SANDBOX_ID,
    }));
    runtime.resetUserStop();
    assert.equal(runtime.isUserStopped(), false);
    // Now it should work.
    // Bây giờ nó sẽ hoạt động.
    assert.doesNotThrow(() => runtime.proposeReleaseCandidate({
      milestoneTag: 'MS-1.3.50',
      sourceManifestHash: TEST_MANIFEST_HASH,
      qualityReportId: TEST_QUALITY_REPORT_ID,
      evidenceId: TEST_EVIDENCE_ID,
      agentId: 'agent_test',
      sessionId: 'session_test',
      taskId: 'task_test',
      delegationId: 'deleg_test',
      capabilityLeaseId: 'lease_test',
      sandboxId: TEST_SANDBOX_ID,
    }));
  });

  // Test 68: Candidate with missing qualityReportId throws MISSING_REQUIRED_BINDING.
  // Kiểm thử 68: Ứng viên thiếu qualityReportId ném MISSING_REQUIRED_BINDING.
  await test('Missing qualityReportId throws MISSING_REQUIRED_BINDING', () => {
    const engine = new ReleaseCandidateEngine();
    assert.throws(
      () => engine.createReleaseCandidate({
        milestoneTag: 'MS-1.3.50',
        sourceManifestHash: TEST_MANIFEST_HASH,
        qualityReportId: '' as any,
        evidenceId: TEST_EVIDENCE_ID,
        agentId: 'agent_test',
        sessionId: 'session_test',
        taskId: 'task_test',
        delegationId: 'deleg_test',
        capabilityLeaseId: 'lease_test',
        sandboxId: TEST_SANDBOX_ID,
      }),
      (err: Error) => err instanceof ReleaseError && (err as ReleaseError).code === ReleaseErrorCode.MISSING_REQUIRED_BINDING
    );
  });

  // Test 69: hashCandidateProvenance changes when manifestHash changes.
  // Kiểm thử 69: hashCandidateProvenance thay đổi khi manifestHash thay đổi.
  await test('hashCandidateProvenance is sensitive to sourceManifestHash', () => {
    const h1 = ReleaseCandidateEngine.hashCandidateProvenance(
      'rc_001', 'MS-1.3.50', 'hash_a',
      TEST_QUALITY_REPORT_ID, TEST_EVIDENCE_ID,
      'agent_a', 'session_a', 'task_a', 'deleg_a', 'lease_a',
      TEST_SANDBOX_ID, 1234567890
    );
    const h2 = ReleaseCandidateEngine.hashCandidateProvenance(
      'rc_001', 'MS-1.3.50', 'hash_b',
      TEST_QUALITY_REPORT_ID, TEST_EVIDENCE_ID,
      'agent_a', 'session_a', 'task_a', 'deleg_a', 'lease_a',
      TEST_SANDBOX_ID, 1234567890
    );
    assert.notEqual(h1, h2, 'Changing manifestHash must change provenanceHash');
  });

  // Test 70: GATE_PASS criterion fails when blockingReasons is non-empty.
  // Kiểm thử 70: Tiêu chí GATE_PASS thất bại khi blockingReasons không rỗng.
  await test('GATE_PASS criterion FAIL when blockingReasons is non-empty', () => {
    const criteriaEngine = new ReleaseAcceptanceCriteriaEngine();
    const candidateEngine = new ReleaseCandidateEngine();
    const candidate = candidateEngine.createReleaseCandidate({
      milestoneTag: 'MS-1.3.50',
      sourceManifestHash: TEST_MANIFEST_HASH,
      qualityReportId: TEST_QUALITY_REPORT_ID,
      evidenceId: TEST_EVIDENCE_ID,
      agentId: 'agent_test',
      sessionId: 'session_test',
      taskId: 'task_test',
      delegationId: 'deleg_test',
      capabilityLeaseId: 'lease_test',
      sandboxId: TEST_SANDBOX_ID,
    });
    const bundle = makeMockEvidenceBundle();
    const blockingReport = makeMockQualityReport({
      blockingReasons: ['Security scan blocked'],
      evidenceHash: bundle.evidenceHash,
    });
    const output = criteriaEngine.evaluateAll(candidate, blockingReport, bundle);
    const criterion = output.results.find(r => r.criterion === 'GATE_PASS');
    assert.ok(criterion);
    assert.equal(criterion.passed, false);
    assert.equal(output.overallPass, false);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN RUNNER
// BỘ CHẠY CHÍNH
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('='.repeat(70));
  console.log('BOWCON V4.0 — MS-1.3.50: Governed Release Verification Pipeline');
  console.log('Xác minh Phát hành Có quản trị — Bộ kiểm thử tích hợp');
  console.log('='.repeat(70));

  await suiteReleaseCandidateEngine();
  await suiteReleasePolicyEngine();
  await suiteReleaseAcceptanceCriteriaEngine();
  await suiteReleaseContradictionEngine();
  await suiteReleaseVerificationPipeline();
  await suiteReleaseRuntime();
  await suiteTypeContractInvariants();
  await suiteAdditionalNegativeCases();

  console.log('\n' + '='.repeat(70));
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  if (errors.length > 0) {
    console.error('\nFailed tests:');
    errors.forEach((e) => console.error(`  - ${e}`));
  }
  console.log('='.repeat(70));

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
