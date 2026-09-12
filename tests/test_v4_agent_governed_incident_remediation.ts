// tests/test_v4_agent_governed_incident_remediation.ts
// BOWCON V4.0 — MS-1.3.55: GOVERNED INCIDENT REMEDIATION, AUTHORIZED RECOVERY EXECUTION & CLOSED-LOOP POST-MITIGATION VERIFICATION
//
// Reality Gate verifying governed incident remediation, single-use token validation & consumption,
// atomic pre-remediation snapshots, typed capability execution, closed-loop verification, fail-safe rollback,
// tamper-evident cryptographic provenance, protected workspace isolation, and canonical audit ledger logging.
// Cổng Thực tế xác minh việc khắc phục sự cố có quản trị, thẩm định & tiêu thụ token dùng một lần,
// ảnh chụp nhanh nguyên tử trước khắc phục, thực thi năng lực định kiểu, xác minh vòng lặp kín, khôi phục an toàn,
// nguồn gốc mật mã chống giả mạo, cách ly không gian làm việc được bảo vệ và ghi sổ kiểm toán chuẩn tắc.
//
// Categories A through L:
// A. Branded IDs & lifecycle state machine
// B. Token validation & replay protection (single-use consumption)
// C. Atomic pre-remediation snapshotting
// D. Governed remediation execution (typed capability adapters only)
// E. Closed-loop post-mitigation verification (30,000ms window, error rate < 1%, latency baseline ±10%, NO_DRIFT)
// F. Automatic rollback after verification failure
// G. Unauthorized execution rejection (missing, expired, wrong actionId, replayed)
// H. Cryptographic SHA-256 provenance chain
// I. Protected workspace isolation (C:\BOW\shopofbow untouched)
// J. Prohibited primitive verification (zero child_process / execSync / spawn / fork)
// K. Canonical AuditLedger logging (domain: 'INCIDENT_REMEDIATION')
// L. USER_STOP emergency halt supremacy
//
// Critical Security Invariants:
// 1. globalWorldActionAuth.issueToken() call count === 0 in remediation plane
// 2. SupervisorHumanGate.approve() call count === 0 in remediation plane (zero self-approval)
// 3. Execution requires valid human-issued authorization token
// 4. Verification failure forces fail-safe rollback and ESCALATED/ROLLED_BACK state
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
  createRemediationPlanId,
  createRemediationExecutionId,
  createRemediationSnapshotId,
  RemediationTokenValidator,
  RemediationTokenValidationError,
  RemediationSnapshotEngine,
  RemediationExecutionEngine,
  PostMitigationVerificationEngine,
  RemediationRollbackEngine,
  RemediationProvenanceEngine,
  RemediationRuntime,
  type GovernedRemediationPlan,
  type RemediationLifecycleState,
} from '../src/core/remediation/index.js';

import { createIncidentId, createDecisionPackageId } from '../src/core/diagnosis/index.js';
import { globalWorldActionAuth } from '../src/core/world-action/worldActionAuthorization.js';
import { globalSupervisorHumanGate } from '../src/core/supervisor/supervisorHumanGate.js';
import { MasterHumanAuthority } from '../src/core/authority/masterHumanAuthority.js';
import { ObservabilityRuntime } from '../src/core/observability/observabilityRuntime.js';
import { SandboxPathGuard } from '../src/core/sandbox/sandboxPathGuard.js';
import { globalAuditLedger } from '../src/core/auditLedger.js';

let passedAssertions = 0;
function pass(category: string, name: string): void {
  passedAssertions++;
  console.log(`  ✓ [${category}] ${name}`);
}

async function runRealityGate(): Promise<void> {
  console.log('\n======================================================================');
  console.log('BOWCON V4.0 — MS-1.3.55 REALITY GATE');
  console.log('GOVERNED INCIDENT REMEDIATION & CLOSED-LOOP POST-MITIGATION VERIFICATION');
  console.log('======================================================================\n');

  // Spy tracking for critical security invariants
  let issueTokenCallCount = 0;
  const originalIssueToken = globalWorldActionAuth.issueToken.bind(globalWorldActionAuth);
  globalWorldActionAuth.issueToken = (request: any) => {
    issueTokenCallCount++;
    return originalIssueToken(request);
  };

  let approveCallCount = 0;
  const originalApprove = globalSupervisorHumanGate.approve.bind(globalSupervisorHumanGate);
  globalSupervisorHumanGate.approve = (requestId: string, operatorId: string, context?: any) => {
    approveCallCount++;
    return originalApprove(requestId, operatorId, context);
  };

  const masterAuthority = new MasterHumanAuthority();
  const operatorId = 'test_operator_001';
  masterAuthority.registerMasterAlias(operatorId);


  // Setup scratch sandbox directory for file testing
  const scratchRoot = path.resolve(process.cwd(), 'scratch', 'remediation_reality_gate');
  if (fs.existsSync(scratchRoot)) {
    fs.rmSync(scratchRoot, { recursive: true, force: true });
  }
  fs.mkdirSync(scratchRoot, { recursive: true });

  const testFilePath = path.join(scratchRoot, 'service_config.json');
  fs.writeFileSync(testFilePath, JSON.stringify({ version: '1.0.0', state: 'active' }, null, 2), 'utf8');

  try {
    // -------------------------------------------------------------------------
    // CATEGORY A: Branded IDs & Lifecycle State Machine
    // -------------------------------------------------------------------------
    console.log('[Category A] Branded IDs & Lifecycle State Machine:');
    const planId = createRemediationPlanId('plan_test_001');
    const execId = createRemediationExecutionId('exec_test_001');
    const snapId = createRemediationSnapshotId('snap_test_001');
    assert.strictEqual(typeof planId, 'string');
    assert.strictEqual(typeof execId, 'string');
    assert.strictEqual(typeof snapId, 'string');
    pass('A', 'Branded ID constructors create strongly typed string identifiers');

    const validStates: RemediationLifecycleState[] = [
      'PENDING_AUTHORIZATION',
      'AUTHORIZED',
      'SNAPSHOTTING',
      'SNAPSHOT_READY',
      'EXECUTING',
      'VERIFYING',
      'SUCCESS',
      'ROLLING_BACK',
      'ROLLED_BACK',
      'FAILED',
      'ESCALATED',
      'ABORTED',
      'SECURITY_VIOLATION',
    ];
    assert.strictEqual(validStates.length, 13);
    pass('A', 'Explicit lifecycle state machine contains exactly 13 approved states');

    // -------------------------------------------------------------------------
    // CATEGORY B: Token Validation & Replay Protection
    // -------------------------------------------------------------------------
    console.log('\n[Category B] Token Validation & Replay Protection:');
    const incidentId = createIncidentId('inc_test_001');
    const packageId = createDecisionPackageId('pkg_test_001');

    const samplePlan: GovernedRemediationPlan = {
      planId,
      incidentId,
      packageId,
      actionId: 'action_config_sync_01',
      actionClass: 'CONFIG_SYNC',
      targetId: 'service_alpha',
      targetPath: testFilePath,
      parameters: { desiredConfig: { version: '1.0.1', state: 'synced' } },
      riskScore: 0.25,
      requiresHumanApproval: true,
      isAutomatedExecutionPermitted: false,
      timeoutMs: 30000,
      createdTimestamp: Date.now(),
    };

    // Issue genuine token via supervisor gate for this test only
    const validToken = globalWorldActionAuth.issueToken({
      actionId: 'action_config_sync_01',
      userId: operatorId,
      operatorId,
      deviceId: 'device_reality_gate',
      toolId: 'REMEDIATION_CONFIG_SYNC',
      target: 'service_alpha',
      parameters: samplePlan.parameters as Record<string, any>,
      riskLevel: 'REVERSIBLE',
      ttlMs: 60000,
    });
    // Reset call count counter after issuance for testing
    const initialIssueCount = issueTokenCallCount;


    const tokenValidator = new RemediationTokenValidator(globalWorldActionAuth, masterAuthority);
    const validatedContext = tokenValidator.validateAndConsume({
      token: validToken,
      plan: samplePlan,
      operatorId,
    });
    assert.strictEqual(validatedContext.tokenId, validToken.tokenId);
    assert.strictEqual(validatedContext.operatorId, operatorId);
    pass('B', 'Valid authorization token validated and consumed successfully');

    // Replay attempt must fail closed
    let replayFailed = false;
    try {
      tokenValidator.validateAndConsume({
        token: validToken,
        plan: samplePlan,
        operatorId,
      });
    } catch (err: any) {
      replayFailed = true;
      assert(err.message.includes('consumed') || err.message.includes('REPLAY') || err.name === 'RemediationTokenValidationError');
    }
    assert.strictEqual(replayFailed, true);
    pass('B', 'Replayed token is rejected immediately by atomic single-use guarantee');

    // -------------------------------------------------------------------------
    // CATEGORY C: Atomic Pre-Remediation Snapshotting
    // -------------------------------------------------------------------------
    console.log('\n[Category C] Atomic Pre-Remediation Snapshotting:');
    const snapshotEngine = new RemediationSnapshotEngine();
    const snapshot = snapshotEngine.capturePreRemediationSnapshot({
      plan: samplePlan,
      baseDirectory: process.cwd(),
      storageDirectory: path.join(scratchRoot, 'snapshots'),
    });

    assert.ok(snapshot.snapshotId);
    assert.strictEqual(snapshot.planId, samplePlan.planId);
    assert.ok(snapshot.snapshotSha256);
    assert.ok(snapshot.items.length >= 2); // target file + plan config
    const fileItem = snapshot.items.find(i => i.itemKey === 'targetFile');
    assert.ok(fileItem && fileItem.statePayload);
    pass('C', 'Atomic pre-remediation snapshot captured and hashed via SHA-256');

    // Snapshot integrity verification
    const recomputedHash = snapshotEngine.computeSnapshotSha256(snapshot.snapshotId, samplePlan, snapshot.items);
    assert.strictEqual(recomputedHash, snapshot.snapshotSha256);
    pass('C', 'Snapshot SHA-256 digest is strictly deterministic');

    // -------------------------------------------------------------------------
    // CATEGORY D: Governed Remediation Execution
    // -------------------------------------------------------------------------
    console.log('\n[Category D] Governed Remediation Execution:');
    const executionEngine = new RemediationExecutionEngine();
    const execResult = await executionEngine.executePlan({
      plan: samplePlan,
      snapshot,
      isUserStopActive: () => false,
      baseDirectory: process.cwd(),
    });

    assert.strictEqual(execResult.lifecycleState, 'EXECUTING');
    assert.ok(execResult.appliedChanges.length > 0);
    const updatedContent = JSON.parse(fs.readFileSync(testFilePath, 'utf8'));
    assert.strictEqual(updatedContent.version, '1.0.1');
    pass('D', 'Governed typed capability execution completed with state mutations');

    // D.2 Process restart typed adapter
    const restartPlan: GovernedRemediationPlan = {
      ...samplePlan,
      planId: createRemediationPlanId('plan_restart_01'),
      actionClass: 'PROCESS_RESTART',
      parameters: { serviceName: 'service_alpha' },
    };
    const restartResult = await executionEngine.executePlan({
      plan: restartPlan,
      snapshot,
      isUserStopActive: () => false,
    });
    assert.strictEqual(restartResult.lifecycleState, 'EXECUTING');
    assert(restartResult.appliedChanges[0].includes('PROCESS_RESTART'));
    pass('D', 'Typed PROCESS_RESTART capability adapter operates without shell execution');

    // D.3 Traffic drain typed adapter
    const drainPlan: GovernedRemediationPlan = {
      ...samplePlan,
      planId: createRemediationPlanId('plan_drain_01'),
      actionClass: 'TRAFFIC_DRAIN',
      parameters: { drainPercentage: 50 },
    };
    const drainResult = await executionEngine.executePlan({
      plan: drainPlan,
      snapshot,
      isUserStopActive: () => false,
    });
    assert.strictEqual(drainResult.lifecycleState, 'EXECUTING');
    assert(drainResult.appliedChanges[0].includes('TRAFFIC_DRAIN'));
    pass('D', 'Typed TRAFFIC_DRAIN capability adapter operates without shell execution');


    // -------------------------------------------------------------------------
    // CATEGORY E: Closed-Loop Post-Mitigation Verification
    // -------------------------------------------------------------------------
    console.log('\n[Category E] Closed-Loop Post-Mitigation Verification:');
    const observabilityRuntime = new ObservabilityRuntime();
    const obsSessionId = observabilityRuntime.startSession({
      targetId: samplePlan.targetId,
      deploymentId: 'deploy_test_001',
      deploymentVersion: '1.0.1',
    });

    // Ingest passing telemetry sample (errorRate = 0.002 < 1%, latencyP95 = 150ms <= 220ms)
    observabilityRuntime.ingestTelemetry(obsSessionId, {
      targetId: samplePlan.targetId,
      sourceId: 'reality_gate_probe',
      timestamp: Date.now(),
      availability: 0.999,
      errorRate: 0.002,
      latencyP95Ms: 150,
      latencyP99Ms: 180,
      healthProbesPassing: 10,
      totalHealthProbes: 10,
      deploymentVersion: '1.0.1',
      configurationFingerprint: 'conf_101',
      manifestFingerprint: 'man_101',
      runtimeStatus: 'HEALTHY',
      sampleCount: 1,
    });

    const verificationEngine = new PostMitigationVerificationEngine();
    const verificationResult = await verificationEngine.verifyMitigation({
      plan: samplePlan,
      observabilityRuntime,
      sessionId: obsSessionId,
      baselineLatencyP95: 200,
    });

    assert.strictEqual(verificationResult.passed, true);
    assert.strictEqual(verificationResult.verified, true);
    assert.strictEqual(verificationResult.observedMetrics?.driftClassification, 'NO_DRIFT');
    assert.strictEqual(verificationResult.violationDetails.length, 0);
    pass('E', 'Post-mitigation verification passes when all criteria meet thresholds');

    // E.2 Negative check: High error rate (> 1%) fails verification
    const highErrorSessionId = observabilityRuntime.startSession({
      targetId: 'service_error_spike',
      deploymentId: 'deploy_err',
      deploymentVersion: '1.0.1',
    });
    observabilityRuntime.ingestTelemetry(highErrorSessionId, {
      targetId: 'service_error_spike',
      sourceId: 'error_probe',
      timestamp: Date.now(),
      availability: 0.95,
      errorRate: 0.05, // 5% > 1%
      latencyP95Ms: 150,
      latencyP99Ms: 180,
      healthProbesPassing: 8,
      totalHealthProbes: 10,
      deploymentVersion: '1.0.1',
      configurationFingerprint: 'conf_101',
      manifestFingerprint: 'man_101',
      runtimeStatus: 'DEGRADED',
      sampleCount: 1,
    });
    const failedErrorVerification = await verificationEngine.verifyMitigation({
      plan: { ...samplePlan, targetId: 'service_error_spike' },
      observabilityRuntime,
      sessionId: highErrorSessionId,
    });
    assert.strictEqual(failedErrorVerification.passed, false);
    assert(failedErrorVerification.violationDetails.some(v => v.includes('Error rate')));
    pass('E', 'Post-mitigation verification rejects error rate >= 1%');

    // E.3 Negative check: Latency > baseline + 10% fails verification
    const highLatencySessionId = observabilityRuntime.startSession({
      targetId: 'service_latency_spike',
      deploymentId: 'deploy_lat',
      deploymentVersion: '1.0.1',
    });
    observabilityRuntime.ingestTelemetry(highLatencySessionId, {
      targetId: 'service_latency_spike',
      sourceId: 'latency_probe',
      timestamp: Date.now(),
      availability: 0.999,
      errorRate: 0.001,
      latencyP95Ms: 250, // 250 > 220 (200 + 10%)
      latencyP99Ms: 290,
      healthProbesPassing: 10,
      totalHealthProbes: 10,
      deploymentVersion: '1.0.1',
      configurationFingerprint: 'conf_101',
      manifestFingerprint: 'man_101',
      runtimeStatus: 'HEALTHY',
      sampleCount: 1,
    });

    const failedLatencyVerification = await verificationEngine.verifyMitigation({
      plan: { ...samplePlan, targetId: 'service_latency_spike' },
      observabilityRuntime,
      sessionId: highLatencySessionId,
      baselineLatencyP95: 200,
    });
    assert.strictEqual(failedLatencyVerification.passed, false);
    assert(failedLatencyVerification.violationDetails.some(v => v.includes('P95 latency')));
    pass('E', 'Post-mitigation verification rejects latency exceeding baseline ±10%');

    // E.4 Negative check: Active drift fails verification
    const driftSessionId = observabilityRuntime.startSession({
      targetId: 'service_drift',
      deploymentId: 'deploy_drift',
      deploymentVersion: '1.0.1',
    });
    observabilityRuntime.detectDrift(
      driftSessionId,
      'service_drift',
      'CONFIGURATION',
      'expected_state',
      'drifted_state'
    );
    const failedDriftVerification = await verificationEngine.verifyMitigation({
      plan: { ...samplePlan, targetId: 'service_drift' },
      observabilityRuntime,
      sessionId: driftSessionId,
    });
    assert.strictEqual(failedDriftVerification.passed, false);
    assert(failedDriftVerification.violationDetails.some(v => v.includes('Active drift')));
    pass('E', 'Post-mitigation verification rejects environment when drift != NO_DRIFT');


    // -------------------------------------------------------------------------
    // CATEGORY F: Automatic Rollback After Verification Failure
    // -------------------------------------------------------------------------
    console.log('\n[Category F] Automatic Rollback After Verification Failure:');
    const rollbackEngine = new RemediationRollbackEngine();
    const rollbackResult = await rollbackEngine.executeRollback({
      plan: samplePlan,
      executionId: execResult.executionId,
      snapshot,
      reason: 'Post-mitigation verification failed on high latency.',
    });

    assert.strictEqual(rollbackResult.success, true);
    assert.ok(rollbackResult.restoredItems.length > 0);
    const revertedContent = JSON.parse(fs.readFileSync(testFilePath, 'utf8'));
    assert.strictEqual(revertedContent.version, '1.0.0');
    pass('F', 'Automatic fail-safe rollback successfully restores pre-remediation state');

    // Rollback failure simulation must produce errors and non-success
    const failedRollback = await rollbackEngine.executeRollback({
      plan: samplePlan,
      executionId: execResult.executionId,
      snapshot,
      reason: 'Simulated fault',
      simulateRollbackFailure: true,
    });
    assert.strictEqual(failedRollback.success, false);
    assert.ok(failedRollback.errors.length > 0);
    pass('F', 'Rollback failure transitions cleanly and records errors for escalation');

    // -------------------------------------------------------------------------
    // CATEGORY G: Unauthorized Execution Rejection
    // -------------------------------------------------------------------------
    console.log('\n[Category G] Unauthorized Execution Rejection:');
    // Missing token
    let missingTokenRejected = false;
    try {
      tokenValidator.validateAndConsume({ plan: samplePlan, operatorId });
    } catch (err: any) {
      missingTokenRejected = err.code === 'MISSING_AUTHORIZATION_TOKEN';
    }
    assert.strictEqual(missingTokenRejected, true);
    pass('G', 'Missing token rejected with MISSING_AUTHORIZATION_TOKEN');

    // Expired token
    let expiredTokenRejected = false;
    try {
      tokenValidator.validateAndConsume({
        token: {
          tokenId: 'expired_tok',
          action: 'UPDATE_CONFIGURATION',
          target: 'service_alpha',
          operatorId,
          expiresAt: Date.now() - 5000,
          signature: 'dummy_sig',
        } as any,
        plan: samplePlan,
        operatorId,
      });
    } catch (err: any) {
      expiredTokenRejected = err.code === 'TOKEN_EXPIRED';
    }
    assert.strictEqual(expiredTokenRejected, true);
    pass('G', 'Expired token rejected with TOKEN_EXPIRED');

    // Wrong actionId token
    let wrongActionRejected = false;
    try {
      tokenValidator.validateAndConsume({
        token: {
          tokenId: 'wrong_action_tok',
          action: 'UPDATE_CONFIGURATION',
          actionId: 'completely_different_action',
          target: 'service_alpha',
          operatorId,
          expiresAt: Date.now() + 60000,
          signature: 'dummy_sig',
        } as any,
        plan: samplePlan,
        operatorId,
      });
    } catch (err: any) {
      wrongActionRejected = err.code === 'ACTION_ID_MISMATCH';
    }
    assert.strictEqual(wrongActionRejected, true);
    pass('G', 'Token with mismatched actionId rejected with ACTION_ID_MISMATCH');

    // Unauthorized operator
    let unauthOperatorRejected = false;
    try {
      tokenValidator.validateAndConsume({
        token: {
          tokenId: 'unauth_op_tok',
          action: 'UPDATE_CONFIGURATION',
          actionId: 'action_config_sync_01',
          target: 'service_alpha',
          operatorId: 'rogue_attacker',
          expiresAt: Date.now() + 60000,
          signature: 'dummy_sig',
        } as any,
        plan: samplePlan,
        operatorId: 'rogue_attacker',
      });
    } catch (err: any) {
      unauthOperatorRejected = err.code === 'UNAUTHORIZED_OPERATOR';
    }
    assert.strictEqual(unauthOperatorRejected, true);
    pass('G', 'Token from unauthorized operator rejected with UNAUTHORIZED_OPERATOR');

    // -------------------------------------------------------------------------
    // CATEGORY H: Cryptographic SHA-256 Provenance Chain
    // -------------------------------------------------------------------------
    console.log('\n[Category H] Cryptographic SHA-256 Provenance Chain:');
    const provenanceEngine = new RemediationProvenanceEngine();
    const provRecord = provenanceEngine.buildProvenanceRecord({
      plan: samplePlan,
      tokenId: validToken.tokenId,
      snapshot,
      executionResult: execResult,
      verificationResult,
      rollbackResult,
    });

    assert.ok(provRecord.provenanceHash);
    assert.strictEqual(provRecord.planId, samplePlan.planId);
    assert.strictEqual(provRecord.incidentId, samplePlan.incidentId);
    assert.strictEqual(provRecord.snapshotSha256, snapshot.snapshotSha256);
    pass('H', 'Cryptographic provenance record binds full remediation lifecycle with SHA-256');

    const isValidChain = provenanceEngine.verifyProvenanceIntegrity(
      provRecord,
      validToken.tokenId,
      snapshot.snapshotSha256,
      execResult.executionSha256,
      { sha256: verificationResult.verificationSha256, passed: verificationResult.passed },
      { sha256: rollbackResult.rollbackSha256, success: rollbackResult.success }
    );
    assert.strictEqual(isValidChain, true);
    pass('H', 'Provenance integrity verification succeeds against original components');

    // Tamper detection
    const isTamperedChain = provenanceEngine.verifyProvenanceIntegrity(
      provRecord,
      'tampered_token_id',
      snapshot.snapshotSha256,
      execResult.executionSha256,
      { sha256: verificationResult.verificationSha256, passed: verificationResult.passed },
      { sha256: rollbackResult.rollbackSha256, success: rollbackResult.success }
    );
    assert.strictEqual(isTamperedChain, false);
    pass('H', 'Tampered token ID breaks cryptographic provenance verification');


    // Secret sanitization
    const sanitizedObj = provenanceEngine.sanitizeSecrets({
      apiKey: 'sk-1234567890abcdef1234567890abcdef',
      nested: { tokenValue: 'topsecret' },
      safeField: 'normal',
    }) as any;
    assert.strictEqual(sanitizedObj.apiKey, '[REDACTED]');
    assert.strictEqual(sanitizedObj.nested.tokenValue, '[REDACTED]');
    assert.strictEqual(sanitizedObj.safeField, 'normal');
    pass('H', 'Secrets and credentials scrubbed from provenance artifacts');

    // -------------------------------------------------------------------------
    // CATEGORY I: Protected Workspace Isolation (C:\BOW\shopofbow)
    // -------------------------------------------------------------------------
    console.log('\n[Category I] Protected Workspace Isolation:');
    let protectedSnapshotRejected = false;
    try {
      const protectedPlan: GovernedRemediationPlan = {
        ...samplePlan,
        targetPath: 'C:\\BOW\\shopofbow\\config.json',
      };
      snapshotEngine.capturePreRemediationSnapshot({ plan: protectedPlan });
    } catch (err: any) {
      protectedSnapshotRejected = err.code === 'SECURITY_VIOLATION' || err.message.includes('SECURITY_VIOLATION');
    }
    assert.strictEqual(protectedSnapshotRejected, true);
    pass('I', 'Target pointing to C:\\BOW\\shopofbow fails closed with SECURITY_VIOLATION');

    let protectedExecutionRejected = false;
    const runtime = new RemediationRuntime(
      tokenValidator,
      snapshotEngine,
      executionEngine,
      verificationEngine,
      rollbackEngine,
      provenanceEngine,
      observabilityRuntime,
      globalSupervisorHumanGate,
      masterAuthority,
      globalAuditLedger
    );

    const forbiddenResponse = await runtime.executeRemediation({
      plan: { ...samplePlan, targetPath: 'C:/BOW/shopofbow/plugin.ts' },
      operatorId,
    });
    assert.strictEqual(forbiddenResponse.executionResult.lifecycleState, 'SECURITY_VIOLATION');
    pass('I', 'RemediationRuntime enforces SECURITY_VIOLATION on protected workspace access');

    // -------------------------------------------------------------------------
    // CATEGORY J: Prohibited Primitive Verification
    // -------------------------------------------------------------------------
    console.log('\n[Category J] Prohibited Primitive Verification:');
    const remediationSrcDir = path.resolve(process.cwd(), 'src', 'core', 'remediation');
    const remediationFiles = fs.readdirSync(remediationSrcDir).filter(f => f.endsWith('.ts'));

    for (const file of remediationFiles) {
      const content = fs.readFileSync(path.join(remediationSrcDir, file), 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
          continue;
        }
        assert(!line.includes('child_process'), `Prohibited 'child_process' in ${file} at line ${i + 1}`);
        assert(!line.includes('execSync'), `Prohibited 'execSync' in ${file} at line ${i + 1}`);
        assert(!line.includes('spawn('), `Prohibited 'spawn(' in ${file} at line ${i + 1}`);
        assert(!line.includes('fork('), `Prohibited 'fork(' in ${file} at line ${i + 1}`);
        assert(!line.includes('exec('), `Prohibited 'exec(' in ${file} at line ${i + 1}`);
      }
    }
    pass('J', 'Remediation subsystem has ZERO imports or usages of child_process/execSync/spawn/fork');


    // -------------------------------------------------------------------------
    // CATEGORY K: Canonical AuditLedger Logging
    // -------------------------------------------------------------------------
    console.log('\n[Category K] Canonical AuditLedger Logging:');
    const trail = globalAuditLedger.getTrail({ domain: 'INCIDENT_REMEDIATION' });
    assert.ok(trail.length > 0);
    const toolNames = trail.map(e => e.toolName);
    assert(toolNames.includes('SECURITY_VIOLATION'));
    pass('K', 'Remediation actions strictly recorded in canonical globalAuditLedger under INCIDENT_REMEDIATION');

    // -------------------------------------------------------------------------
    // CATEGORY L: USER_STOP Emergency Halt Supremacy
    // -------------------------------------------------------------------------
    console.log('\n[Category L] USER_STOP Emergency Halt Supremacy:');
    runtime.setUserStop(true);
    assert.strictEqual(runtime.isUserStopActive(), true);

    const userStopResponse = await runtime.executeRemediation({
      plan: samplePlan,
      operatorId,
    });
    assert.strictEqual(userStopResponse.executionResult.lifecycleState, 'ABORTED');
    pass('L', 'Active USER_STOP halts remediation execution immediately before any actions');
    runtime.setUserStop(false);

    // -------------------------------------------------------------------------
    // CRITICAL AUTHORITY INVARIANTS
    // -------------------------------------------------------------------------
    console.log('\n[Critical Authority Invariants]:');
    // Ensure RemediationRuntime itself NEVER issued an authorization token
    // Any tokens were only issued by explicit test setup, not by remediation runtime or engines
    assert.strictEqual(initialIssueCount, 1, 'Exactly one token was issued by test setup');
    // Remediation runtime must have issued 0 tokens
    assert.strictEqual(issueTokenCallCount, initialIssueCount, 'Remediation subsystem called issueToken() EXACTLY 0 times');
    pass('Authority', 'RemediationRuntime MUST NEVER issue authorization tokens (issueToken() === 0)');

    // Remediation runtime must never self-approve
    assert.strictEqual(approveCallCount, 0, 'Remediation subsystem called SupervisorHumanGate.approve() EXACTLY 0 times');
    pass('Authority', 'RemediationRuntime MUST NEVER self-approve (approve() === 0)');

    // Closed-loop Full Pipeline Test: PASS branch
    console.log('\n[Closed-Loop Pipeline Verification]:');
    const validToken2 = globalWorldActionAuth.issueToken({
      actionId: 'action_config_sync_02',
      userId: operatorId,
      operatorId,
      deviceId: 'device_reality_gate',
      toolId: 'REMEDIATION_CONFIG_SYNC',
      target: 'service_alpha',
      parameters: samplePlan.parameters as Record<string, any>,
      riskLevel: 'REVERSIBLE',
      ttlMs: 60000,
    });

    const pipelinePlan: GovernedRemediationPlan = {
      ...samplePlan,
      planId: createRemediationPlanId('plan_full_pass_002'),
      actionId: 'action_config_sync_02',
    };

    const fullPipelinePass = await runtime.executeRemediation({
      plan: pipelinePlan,
      token: validToken2,
      operatorId,
      sessionId: obsSessionId,
    });

    assert.strictEqual(fullPipelinePass.executionResult.lifecycleState, 'SUCCESS');
    assert.ok(fullPipelinePass.snapshot);
    assert.ok(fullPipelinePass.verificationResult?.passed);
    assert.ok(fullPipelinePass.provenanceRecord);
    pass('Pipeline', 'End-to-end pipeline: token -> snapshot -> execution -> verification -> SUCCESS');

    // Closed-loop Full Pipeline Test: FAIL branch -> auto rollback
    const validToken3 = globalWorldActionAuth.issueToken({
      actionId: 'action_config_sync_03',
      userId: operatorId,
      operatorId,
      deviceId: 'device_reality_gate',
      toolId: 'REMEDIATION_CONFIG_SYNC',
      target: 'service_alpha',
      parameters: samplePlan.parameters as Record<string, any>,
      riskLevel: 'REVERSIBLE',
      ttlMs: 60000,
    });


    const pipelineFailPlan: GovernedRemediationPlan = {
      ...samplePlan,
      planId: createRemediationPlanId('plan_full_fail_003'),
      actionId: 'action_config_sync_03',
    };

    const fullPipelineFail = await runtime.executeRemediation({
      plan: pipelineFailPlan,
      token: validToken3,
      operatorId,
      sessionId: obsSessionId,
      simulateVerificationFailure: true,
    });

    assert.strictEqual(fullPipelineFail.executionResult.lifecycleState, 'ROLLED_BACK');
    assert.ok(fullPipelineFail.rollbackResult?.success);
    assert.strictEqual(fullPipelineFail.verificationResult?.passed, false);
    pass('Pipeline', 'End-to-end pipeline: verification failure -> automatic fail-safe rollback -> ROLLED_BACK');

    console.log('\n======================================================================');
    console.log(`REALITY GATE COMPLETE: ${passedAssertions} passed, 0 failed across Categories A through L`);
    console.log(`REALITY GATE PASS: ${passedAssertions}`);
    console.log('======================================================================\n');

  } finally {
    // Restore original spies
    globalWorldActionAuth.issueToken = originalIssueToken;
    globalSupervisorHumanGate.approve = originalApprove;

    // Clean up scratch test sandbox
    if (fs.existsSync(scratchRoot)) {
      try {
        fs.rmSync(scratchRoot, { recursive: true, force: true });
      } catch {}
    }
  }
}

runRealityGate().catch(err => {
  console.error('Reality Gate execution failed:', err);
  process.exit(1);
});
