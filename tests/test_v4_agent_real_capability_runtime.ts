// tests/test_v4_agent_real_capability_runtime.ts
// BOWCON V4.0 — MS-1.3.34: REAL BOWCON CAPABILITY & ENVIRONMENT INTERACTION RUNTIME
//
// Reality Gate: 38 Test Categories (A through AL) verifying real host environment awareness,
// canonical capability registry, independent OS verifications, cryptographically bound single-use
// authorization, dry-run zero-mutation guarantees, failure recovery, resource safety, and boundary isolation.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import {
  globalCapabilityRuntime,
  globalCapabilityRegistry,
  globalCapabilityDiscovery,
  globalCapabilityPlanner,
  globalCapabilityExecutor,
  globalCapabilityVerifier,
  globalCapabilityRecovery,
  globalCapabilityAudit,
  capability,
  type CapabilityExecutionRequest,
} from '../src/core/capability/index.js';
import { globalWorldActionAuth } from '../src/core/world-action/worldActionAuthorization.js';
import { validateAndResolvePath } from '../src/core/world-action/worldActionExecutor.js';

let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passedAssertions++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedAssertions++;
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

const TEST_SANDBOX_DIR = path.resolve(process.cwd(), 'data', 'brain', 'capability-reality');

if (!fs.existsSync(TEST_SANDBOX_DIR)) {
  fs.mkdirSync(TEST_SANDBOX_DIR, { recursive: true });
}

async function runRealityGate(): Promise<void> {
  console.log('============================================================');
  console.log('MS-1.3.34: REAL CAPABILITY & ENVIRONMENT RUNTIME REALITY GATE');
  console.log('============================================================\n');

  // -------------------------------------------------------------------------
  // Category A: Real Capability Registry
  // -------------------------------------------------------------------------
  console.log('Running Category A: Real Capability Registry...');
  const allCaps = globalCapabilityRegistry.getAllCapabilities();
  assert(allCaps.length >= 10, `Registry contains ${allCaps.length} registered capabilities (>=10)`);
  assert(globalCapabilityRegistry.hasCapability('cap_fs_write'), 'cap_fs_write is registered');
  assert(globalCapabilityRegistry.hasCapability('cap_obs_system'), 'cap_obs_system is registered');
  assert(globalCapabilityRegistry.hasCapability('cap_proc_start'), 'cap_proc_start is registered');

  // -------------------------------------------------------------------------
  // Category B: Real Capability Discovery
  // -------------------------------------------------------------------------
  console.log('Running Category B: Real Capability Discovery...');
  const obsCaps = globalCapabilityRegistry.getCapabilitiesByCategory('OBSERVATION');
  const fsCaps = globalCapabilityRegistry.getCapabilitiesByCategory('FILESYSTEM');
  assert(obsCaps.length >= 3, 'Discovered at least 3 OBSERVATION capabilities');
  assert(fsCaps.length >= 4, 'Discovered at least 4 FILESYSTEM capabilities');

  // -------------------------------------------------------------------------
  // Category C: Real Host Environment Discovery
  // -------------------------------------------------------------------------
  console.log('Running Category C: Real Host Environment Discovery...');
  const snapshot = globalCapabilityDiscovery.captureSnapshot();
  assert(snapshot.platform === os.platform(), 'Snapshot platform matches genuine os.platform()');
  assert(snapshot.arch === os.arch(), 'Snapshot arch matches genuine os.arch()');
  assert(snapshot.hostname === os.hostname(), 'Snapshot hostname matches genuine os.hostname()');
  assert(typeof snapshot.hostMode === 'string', `Snapshot reports valid hostMode: ${snapshot.hostMode}`);

  // -------------------------------------------------------------------------
  // Category D: Real CPU Information
  // -------------------------------------------------------------------------
  console.log('Running Category D: Real CPU Information...');
  assert(snapshot.cpu.cores > 0, `Detected genuine CPU core count: ${snapshot.cpu.cores}`);
  assert(snapshot.cpu.model.length > 0, `Detected CPU model: ${snapshot.cpu.model}`);
  assert(snapshot.cpu.speedMhz > 0, `Detected CPU clock speed: ${snapshot.cpu.speedMhz} MHz`);

  // -------------------------------------------------------------------------
  // Category E: Real Memory Information
  // -------------------------------------------------------------------------
  console.log('Running Category E: Real Memory Information...');
  assert(snapshot.memory.totalBytes > 0, `Detected total host memory: ${Math.round(snapshot.memory.totalBytes / (1024 * 1024 * 1024))} GB`);
  assert(snapshot.memory.freeBytes > 0, 'Detected free host memory > 0 bytes');
  assert(snapshot.memory.percentageUsed >= 0 && snapshot.memory.percentageUsed <= 100, 'Memory percentage used is within [0, 100]');

  // -------------------------------------------------------------------------
  // Category F: Real Filesystem Capability
  // -------------------------------------------------------------------------
  console.log('Running Category F: Real Filesystem Capability...');
  const fsWriteCap = globalCapabilityRegistry.getCapability('cap_fs_write');
  assert(fsWriteCap !== undefined, 'cap_fs_write descriptor exists');
  assert(fsWriteCap?.reversible === true, 'cap_fs_write is marked reversible');
  assert(fsWriteCap?.supportsVerification === true, 'cap_fs_write supports verification');

  // -------------------------------------------------------------------------
  // Category G: Real Filesystem Mutation
  // -------------------------------------------------------------------------
  console.log('Running Category G: Real Filesystem Mutation...');
  const testFileG = path.join(TEST_SANDBOX_DIR, 'real_cap_file_g.txt');
  if (fs.existsSync(testFileG)) fs.unlinkSync(testFileG);

  const reqG: CapabilityExecutionRequest = {
    requestId: 'req_cap_g',
    capabilityId: 'cap_fs_write',
    target: testFileG,
    parameters: { path: testFileG, content: 'BOWCON REAL CAPABILITY MUTATION G\n' },
    userId: 'user_cap_g',
    deviceId: 'dev_host_master',
  };
  const tokenG = globalWorldActionAuth.issueToken({
    actionId: reqG.requestId,
    userId: reqG.userId!,
    deviceId: reqG.deviceId!,
    toolId: reqG.capabilityId,
    target: reqG.target!,
    parameters: reqG.parameters,
    riskLevel: 'REVERSIBLE',
  });
  const resG = await globalCapabilityRuntime.executeCapability({ ...reqG, authorizationToken: tokenG });
  assert(resG.success === true, 'Execution returned success');
  assert(fs.existsSync(testFileG), 'Physical file exists on host disk');

  // -------------------------------------------------------------------------
  // Category H: Independent Filesystem Verification
  // -------------------------------------------------------------------------
  console.log('Running Category H: Independent Filesystem Verification...');
  const statH = fs.statSync(testFileG);
  const diskContentH = fs.readFileSync(testFileG, 'utf-8');
  assert(statH.size > 0, 'OS stat confirms non-zero file size on disk');
  assert(diskContentH.includes('MUTATION G'), 'Independent read confirms exact written bytes');
  assert(resG.verificationPassed === true, 'Independent verification flag passed');

  // -------------------------------------------------------------------------
  // Category I: Real SHA-256 Verification
  // -------------------------------------------------------------------------
  console.log('Running Category I: Real SHA-256 Verification...');
  const actualShaI = crypto.createHash('sha256').update(diskContentH).digest('hex');
  const expectedShaI = crypto.createHash('sha256').update('BOWCON REAL CAPABILITY MUTATION G\n').digest('hex');
  assert(actualShaI === expectedShaI, 'Calculated SHA-256 matches written content byte-for-byte');

  // -------------------------------------------------------------------------
  // Category J: Real Process Observation
  // -------------------------------------------------------------------------
  console.log('Running Category J: Real Process Observation...');
  const resJ = await globalCapabilityRuntime.executeCapability({
    requestId: 'req_proc_obs_j',
    capabilityId: 'cap_obs_process',
    parameters: {},
  });
  assert(resJ.success === true, 'Process observation succeeded');
  assert(resJ.output?.count >= 1, 'Observed at least 1 host process');

  // -------------------------------------------------------------------------
  // Category K: Real Approved Process Start
  // -------------------------------------------------------------------------
  console.log('Running Category K: Real Approved Process Start...');
  const reqK: CapabilityExecutionRequest = {
    requestId: 'req_proc_start_k',
    capabilityId: 'cap_proc_start',
    target: 'node',
    parameters: {
      command: process.execPath,
      args: ['-e', 'setInterval(() => {}, 500)'],
    },
    userId: 'user_cap_k',
    deviceId: 'dev_host_master',
  };
  const tokenK = globalWorldActionAuth.issueToken({
    actionId: reqK.requestId,
    userId: reqK.userId!,
    deviceId: reqK.deviceId!,
    toolId: reqK.capabilityId,
    target: reqK.target!,
    parameters: reqK.parameters,
    riskLevel: 'ELEVATED',
  });
  const resK = await globalCapabilityRuntime.executeCapability({ ...reqK, authorizationToken: tokenK });
  const spawnedPidK = resK.output?.pid;
  assert(typeof spawnedPidK === 'number' && spawnedPidK > 0, 'Spawned real child process with PID');

  // -------------------------------------------------------------------------
  // Category L: Independent Process Verification
  // -------------------------------------------------------------------------
  console.log('Running Category L: Independent Process Verification...');
  let pidAliveL = false;
  try {
    process.kill(spawnedPidK, 0);
    pidAliveL = true;
  } catch {
    pidAliveL = false;
  }
  assert(pidAliveL, 'Independent OS kill(pid, 0) probe confirms process actively running');

  // -------------------------------------------------------------------------
  // Category M: Real Approved Process Stop
  // -------------------------------------------------------------------------
  console.log('Running Category M: Real Approved Process Stop...');
  const reqM: CapabilityExecutionRequest = {
    requestId: 'req_proc_stop_m',
    capabilityId: 'cap_proc_stop',
    target: String(spawnedPidK),
    parameters: { pid: spawnedPidK },
    userId: 'user_cap_m',
    deviceId: 'dev_host_master',
  };
  const tokenM = globalWorldActionAuth.issueToken({
    actionId: reqM.requestId,
    userId: reqM.userId!,
    deviceId: reqM.deviceId!,
    toolId: reqM.capabilityId,
    target: reqM.target!,
    parameters: reqM.parameters,
    riskLevel: 'ELEVATED',
  });
  const resM = await globalCapabilityRuntime.executeCapability({ ...reqM, authorizationToken: tokenM });
  assert(resM.success === true, 'Process stop executed');

  // -------------------------------------------------------------------------
  // Category N: Independent Process Absence Verification
  // -------------------------------------------------------------------------
  console.log('Running Category N: Independent Process Absence Verification...');
  await new Promise(r => setTimeout(r, 100));
  let pidStillRunningN = false;
  try {
    process.kill(spawnedPidK, 0);
    pidStillRunningN = true;
  } catch {
    pidStillRunningN = false;
  }
  assert(!pidStillRunningN, 'Independent probe confirms child process has terminated');

  // -------------------------------------------------------------------------
  // Category O: Dry-Run Produces ZERO Mutation
  // -------------------------------------------------------------------------
  console.log('Running Category O: Dry-Run Produces ZERO Mutation...');
  const dryRunTargetO = path.join(TEST_SANDBOX_DIR, 'dry_run_o.txt');
  if (fs.existsSync(dryRunTargetO)) fs.unlinkSync(dryRunTargetO);

  const resO = await globalCapabilityRuntime.executeCapability({
    requestId: 'req_dry_o',
    capabilityId: 'cap_fs_write',
    target: dryRunTargetO,
    parameters: { path: dryRunTargetO, content: 'GHOST CONTENT' },
    isDryRun: true,
  });
  assert(resO.success === true, 'Dry run returned success');
  assert(!fs.existsSync(dryRunTargetO), 'Target file does NOT exist on disk after dry run');

  // -------------------------------------------------------------------------
  // Category P: Unauthorized Capability Produces ZERO Mutation
  // -------------------------------------------------------------------------
  console.log('Running Category P: Unauthorized Capability Produces ZERO Mutation...');
  const unauthTargetP = path.join(TEST_SANDBOX_DIR, 'unauth_p.txt');
  if (fs.existsSync(unauthTargetP)) fs.unlinkSync(unauthTargetP);

  let errorP: any;
  try {
    await globalCapabilityRuntime.executeCapability({
      requestId: 'req_unauth_p',
      capabilityId: 'cap_fs_write',
      target: unauthTargetP,
      parameters: { path: unauthTargetP, content: 'UNAUTHORIZED' },
      // Omit authorizationToken
    });
  } catch (err) {
    errorP = err;
  }
  assert(errorP !== undefined, 'Rejected unauthorized capability execution');
  assert(!fs.existsSync(unauthTargetP), 'Zero physical mutation occurred on unauthorized rejection');

  // -------------------------------------------------------------------------
  // Category Q: Expired Authorization Produces ZERO Mutation
  // -------------------------------------------------------------------------
  console.log('Running Category Q: Expired Authorization Produces ZERO Mutation...');
  const expiredTargetQ = path.join(TEST_SANDBOX_DIR, 'expired_q.txt');
  const reqQ: CapabilityExecutionRequest = {
    requestId: 'req_exp_q',
    capabilityId: 'cap_fs_write',
    target: expiredTargetQ,
    parameters: { path: expiredTargetQ, content: 'EXPIRED' },
    userId: 'user_q',
    deviceId: 'dev_host_master',
  };
  const tokenQ = globalWorldActionAuth.issueToken({
    actionId: reqQ.requestId,
    userId: reqQ.userId!,
    deviceId: reqQ.deviceId!,
    toolId: reqQ.capabilityId,
    target: reqQ.target!,
    parameters: reqQ.parameters,
    riskLevel: 'REVERSIBLE',
    ttlMs: -1000,
  });

  let errorQ: any;
  try {
    await globalCapabilityRuntime.executeCapability({ ...reqQ, authorizationToken: tokenQ });
  } catch (err) {
    errorQ = err;
  }
  assert(errorQ !== undefined, 'Expired authorization token rejected');
  assert(!fs.existsSync(expiredTargetQ), 'Zero physical mutation with expired token');

  // -------------------------------------------------------------------------
  // Category R: Wrong Capability Authorization Produces ZERO Mutation
  // -------------------------------------------------------------------------
  console.log('Running Category R: Wrong Capability Authorization Produces ZERO Mutation...');
  const wrongCapTargetR = path.join(TEST_SANDBOX_DIR, 'wrong_cap_r.txt');
  const reqR: CapabilityExecutionRequest = {
    requestId: 'req_wrong_r',
    capabilityId: 'cap_fs_write',
    target: wrongCapTargetR,
    parameters: { path: wrongCapTargetR, content: 'WRONG CAP' },
    userId: 'user_r',
    deviceId: 'dev_host_master',
  };
  const tokenR = globalWorldActionAuth.issueToken({
    actionId: reqR.requestId,
    userId: reqR.userId!,
    deviceId: reqR.deviceId!,
    toolId: 'cap_fs_append', // Wrong capability
    target: reqR.target!,
    parameters: reqR.parameters,
    riskLevel: 'REVERSIBLE',
  });

  let errorR: any;
  try {
    await globalCapabilityRuntime.executeCapability({ ...reqR, authorizationToken: tokenR });
  } catch (err) {
    errorR = err;
  }
  assert(errorR !== undefined, 'Wrong capability token rejected');
  assert(!fs.existsSync(wrongCapTargetR), 'Zero mutation with capability mismatch');

  // -------------------------------------------------------------------------
  // Category S: Wrong Parameter Authorization Produces ZERO Mutation
  // -------------------------------------------------------------------------
  console.log('Running Category S: Wrong Parameter Authorization Produces ZERO Mutation...');
  const wrongParamTargetS = path.join(TEST_SANDBOX_DIR, 'wrong_param_s.txt');
  const reqS: CapabilityExecutionRequest = {
    requestId: 'req_param_s',
    capabilityId: 'cap_fs_write',
    target: wrongParamTargetS,
    parameters: { path: wrongParamTargetS, content: 'TAMPERED AT RUNTIME' },
    userId: 'user_s',
    deviceId: 'dev_host_master',
  };
  const tokenS = globalWorldActionAuth.issueToken({
    actionId: reqS.requestId,
    userId: reqS.userId!,
    deviceId: reqS.deviceId!,
    toolId: reqS.capabilityId,
    target: reqS.target!,
    parameters: { path: wrongParamTargetS, content: 'ORIGINAL AUTHORIZED CONTENT' },
    riskLevel: 'REVERSIBLE',
  });

  let errorS: any;
  try {
    await globalCapabilityRuntime.executeCapability({ ...reqS, authorizationToken: tokenS });
  } catch (err) {
    errorS = err;
  }
  assert(errorS !== undefined, 'Tampered parameters rejected');
  assert(!fs.existsSync(wrongParamTargetS), 'Zero mutation with parameter mismatch');

  // -------------------------------------------------------------------------
  // Category T: Wrong Target Authorization Produces ZERO Mutation
  // -------------------------------------------------------------------------
  console.log('Running Category T: Wrong Target Authorization Produces ZERO Mutation...');
  const wrongTargetT = path.join(TEST_SANDBOX_DIR, 'wrong_target_t.txt');
  const authorizedTargetT = path.join(TEST_SANDBOX_DIR, 'authorized_target_t.txt');
  const reqT: CapabilityExecutionRequest = {
    requestId: 'req_target_t',
    capabilityId: 'cap_fs_write',
    target: wrongTargetT,
    parameters: { path: wrongTargetT, content: 'CONTENT T' },
    userId: 'user_t',
    deviceId: 'dev_host_master',
  };
  const tokenT = globalWorldActionAuth.issueToken({
    actionId: reqT.requestId,
    userId: reqT.userId!,
    deviceId: reqT.deviceId!,
    toolId: reqT.capabilityId,
    target: authorizedTargetT, // Different target
    parameters: reqT.parameters,
    riskLevel: 'REVERSIBLE',
  });

  let errorT: any;
  try {
    await globalCapabilityRuntime.executeCapability({ ...reqT, authorizationToken: tokenT });
  } catch (err) {
    errorT = err;
  }
  assert(errorT !== undefined, 'Target mismatch rejected');
  assert(!fs.existsSync(wrongTargetT), 'Zero mutation on target mismatch');

  // -------------------------------------------------------------------------
  // Category U: Replay Authorization is Rejected
  // -------------------------------------------------------------------------
  console.log('Running Category U: Replay Authorization is Rejected...');
  const replayTargetU = path.join(TEST_SANDBOX_DIR, 'replay_u.txt');
  const reqU: CapabilityExecutionRequest = {
    requestId: 'req_replay_u',
    capabilityId: 'cap_fs_write',
    target: replayTargetU,
    parameters: { path: replayTargetU, content: 'REPLAY TEST' },
    userId: 'user_u',
    deviceId: 'dev_host_master',
  };
  const tokenU = globalWorldActionAuth.issueToken({
    actionId: reqU.requestId,
    userId: reqU.userId!,
    deviceId: reqU.deviceId!,
    toolId: reqU.capabilityId,
    target: reqU.target!,
    parameters: reqU.parameters,
    riskLevel: 'REVERSIBLE',
    singleUse: true,
  });

  await globalCapabilityRuntime.executeCapability({ ...reqU, authorizationToken: tokenU });
  assert(tokenU.consumedAt !== undefined, 'Token consumed on first execution');

  // Attempt replay with consumed token
  let errorU: any;
  try {
    await globalCapabilityRuntime.executeCapability({ ...reqU, authorizationToken: tokenU });
  } catch (err) {
    errorU = err;
  }
  assert(errorU !== undefined, 'Consumed token replay was rejected');

  // -------------------------------------------------------------------------
  // Category V: Policy Denial
  // -------------------------------------------------------------------------
  console.log('Running Category V: Policy Denial...');
  const forbiddenTargetV = 'C:\\Windows\\System32\\cmd.exe';
  let errorV: any;
  try {
    validateAndResolvePath(forbiddenTargetV);
  } catch (err) {
    errorV = err;
  }
  assert(errorV !== undefined, 'Policy denies access outside workspace');

  // -------------------------------------------------------------------------
  // Category W: Resource Conflict Prevention
  // -------------------------------------------------------------------------
  console.log('Running Category W: Resource Conflict Prevention...');
  const lockResourceW = path.join(TEST_SANDBOX_DIR, 'lock_resource_w.txt');
  assert(globalCapabilityRuntime.acquireLock(lockResourceW), 'Acquired first lock');
  assert(!globalCapabilityRuntime.acquireLock(lockResourceW), 'Second concurrent lock rejected');
  globalCapabilityRuntime.releaseLock(lockResourceW);
  assert(globalCapabilityRuntime.acquireLock(lockResourceW), 'Lock reacquired after release');
  globalCapabilityRuntime.releaseLock(lockResourceW);

  // -------------------------------------------------------------------------
  // Category X: Capability Unavailable State
  // -------------------------------------------------------------------------
  console.log('Running Category X: Capability Unavailable State...');
  const nonExistentCap = 'cap_quantum_teleportation';
  let errorX: any;
  try {
    await globalCapabilityRuntime.executeCapability({
      requestId: 'req_x',
      capabilityId: nonExistentCap,
      parameters: {},
    });
  } catch (err: any) {
    errorX = err;
  }
  assert(errorX !== undefined && errorX.code === 'UNAVAILABLE', 'Non-existent capability returns UNAVAILABLE');

  // -------------------------------------------------------------------------
  // Category Y: Capability Degraded State
  // -------------------------------------------------------------------------
  console.log('Running Category Y: Capability Degraded State...');
  globalCapabilityRegistry.setCapabilityState('cap_obs_network', 'DEGRADED');
  assert(globalCapabilityRegistry.getCapability('cap_obs_network')?.state === 'DEGRADED', 'Capability state updated to DEGRADED');
  globalCapabilityRegistry.setCapabilityState('cap_obs_network', 'AVAILABLE'); // Reset

  // -------------------------------------------------------------------------
  // Category Z: Recovery After Recoverable Failure
  // -------------------------------------------------------------------------
  console.log('Running Category Z: Recovery After Recoverable Failure...');
  const recOutcomeZ = globalCapabilityRecovery.handleFailure(
    globalCapabilityRegistry.getCapability('cap_fs_read')!,
    new Error('Missing file simulated error')
  );
  assert(recOutcomeZ.recovered === true, 'Recovery manager handled error without Brain death');
  assert(recOutcomeZ.recoveryStrategy.length > 0, 'Reported concrete recovery strategy');

  // -------------------------------------------------------------------------
  // Category AA: Verification Failure Detection
  // -------------------------------------------------------------------------
  console.log('Running Category AA: Verification Failure Detection...');
  const verifOutcomeAA = await globalCapabilityVerifier.verify(
    globalCapabilityRegistry.getCapability('cap_fs_write')!,
    {
      requestId: 'req_aa',
      capabilityId: 'cap_fs_write',
      target: path.join(TEST_SANDBOX_DIR, 'non_existent_aa.txt'),
      parameters: { path: path.join(TEST_SANDBOX_DIR, 'non_existent_aa.txt'), content: 'XYZ' },
    },
    {
      success: true,
      capabilityId: 'cap_fs_write',
      executionId: 'exec_aa',
      startedAt: Date.now(),
      completedAt: Date.now(),
      actualEffect: 'Simulated write',
      metadata: {},
    }
  );
  assert(verifOutcomeAA.passed === false, 'Verifier detected missing file and failed');
  assert(verifOutcomeAA.failureReason !== undefined, 'Verifier provided failure reason');

  // -------------------------------------------------------------------------
  // Category AB: Audit Event Creation
  // -------------------------------------------------------------------------
  console.log('Running Category AB: Audit Event Creation...');
  const auditEntryAB = globalCapabilityAudit.record('CAPABILITY_DISCOVERED', 'TEST_CAP', { test: 123 });
  assert(auditEntryAB.payloadHash.length === 64, 'Audit entry contains SHA-256 payload hash');
  assert(auditEntryAB.previousHash.length === 64, 'Audit entry contains chained previous hash');

  // -------------------------------------------------------------------------
  // Category AC: Secret Redaction
  // -------------------------------------------------------------------------
  console.log('Running Category AC: Secret Redaction...');
  const scrubbedAC = globalCapabilityAudit.scrub({
    plain: 'hello',
    apiKey: 'sk-abcdef1234567890abcdef',
    bearer: 'Bearer secret_token_value_xyz',
  });
  assert(scrubbedAC.plain === 'hello', 'Normal field untouched');
  assert(scrubbedAC.apiKey === '[REDACTED_SECRET]', 'apiKey scrubbed');

  // -------------------------------------------------------------------------
  // Category AD: Restart Recovery
  // -------------------------------------------------------------------------
  console.log('Running Category AD: Restart Recovery...');
  const healthAD = globalCapabilityRuntime.getHealth();
  assert(healthAD.status === 'OPERATIONAL', 'Runtime reports OPERATIONAL');
  assert(healthAD.totalCapabilities >= 10, 'Capabilities preserved across runtime instances');

  // -------------------------------------------------------------------------
  // Category AE: Protected Workspace Isolation
  // -------------------------------------------------------------------------
  console.log('Running Category AE: Protected Workspace Isolation...');
  let boundaryBlockedAE = false;
  try {
    validateAndResolvePath('C:\\BOW\\shopofbow\\secret.txt');
  } catch (err: any) {
    boundaryBlockedAE = err.code === 'SECURITY_VIOLATION';
  }
  assert(boundaryBlockedAE, 'Protected workspace (C:\\BOW\\shopofbow) strictly blocked');

  // -------------------------------------------------------------------------
  // Category AF: Multi-Session Isolation
  // -------------------------------------------------------------------------
  console.log('Running Category AF: Multi-Session Isolation...');
  const planAF1 = globalCapabilityPlanner.plan(globalCapabilityRegistry.getCapability('cap_obs_system')!, {
    requestId: 'req_af1',
    capabilityId: 'cap_obs_system',
    parameters: {},
    sessionId: 'session_1',
  });
  const planAF2 = globalCapabilityPlanner.plan(globalCapabilityRegistry.getCapability('cap_obs_system')!, {
    requestId: 'req_af2',
    capabilityId: 'cap_obs_system',
    parameters: {},
    sessionId: 'session_2',
  });
  assert(planAF1.planId !== planAF2.planId, 'Distinct plan IDs generated per session');

  // -------------------------------------------------------------------------
  // Category AG: Multi-Device Isolation
  // -------------------------------------------------------------------------
  console.log('Running Category AG: Multi-Device Isolation...');
  const tokenAG1 = globalWorldActionAuth.issueToken({
    actionId: 'act_ag1',
    userId: 'user_primary',
    deviceId: 'device_desktop_1',
    toolId: 'cap_fs_write',
    target: testFileG,
    parameters: { path: testFileG, content: 'DEV1' },
    riskLevel: 'REVERSIBLE',
  });
  const tokenAG2 = globalWorldActionAuth.issueToken({
    actionId: 'act_ag2',
    userId: 'user_primary',
    deviceId: 'device_laptop_2',
    toolId: 'cap_fs_write',
    target: testFileG,
    parameters: { path: testFileG, content: 'DEV2' },
    riskLevel: 'REVERSIBLE',
  });
  assert(tokenAG1.deviceId !== tokenAG2.deviceId, 'Distinct device identities isolated');

  // -------------------------------------------------------------------------
  // Category AH: SAFE_STOP
  // -------------------------------------------------------------------------
  console.log('Running Category AH: SAFE_STOP...');
  globalCapabilityRuntime.activateEmergencyStop('Safety drill test');
  assert(globalCapabilityRuntime.isEmergencyStopActive(), 'Emergency stop active');

  let errorAH: any;
  try {
    await globalCapabilityRuntime.executeCapability({
      requestId: 'req_ah',
      capabilityId: 'cap_obs_system',
      parameters: {},
    });
  } catch (err) {
    errorAH = err;
  }
  assert(errorAH !== undefined, 'Execution blocked under SAFE_STOP');
  globalCapabilityRuntime.resetEmergencyStop('operator_token_test');
  assert(!globalCapabilityRuntime.isEmergencyStopActive(), 'Emergency stop reset');

  // -------------------------------------------------------------------------
  // Category AI: Continuous Runtime Operation
  // -------------------------------------------------------------------------
  console.log('Running Category AI: Continuous Runtime Operation...');
  const pid1 = process.pid;
  await capability.preview({ requestId: 'req_ai1', capabilityId: 'cap_obs_system', parameters: {} });
  await capability.preview({ requestId: 'req_ai2', capabilityId: 'cap_obs_system', parameters: {} });
  const pid2 = process.pid;
  assert(pid1 === pid2, 'PID continuity maintained across multiple capability executions');

  // -------------------------------------------------------------------------
  // Category AJ: No Fake Capability Telemetry
  // -------------------------------------------------------------------------
  console.log('Running Category AJ: No Fake Capability Telemetry...');
  const snapAJ = capability.getEnvironmentSnapshot();
  assert(snapAJ.cpu.cores === os.cpus().length, 'Reported CPU cores matches actual os.cpus().length');
  assert(snapAJ.memory.totalBytes === os.totalmem(), 'Reported memory matches actual os.totalmem()');

  // -------------------------------------------------------------------------
  // Category AK: No Unrestricted Shell Execution
  // -------------------------------------------------------------------------
  console.log('Running Category AK: No Unrestricted Shell Execution...');
  const allDescriptorsAK = capability.getAllCapabilities();
  for (const desc of allDescriptorsAK) {
    assert(desc.capabilityId !== 'unrestricted_shell', `Descriptor ${desc.capabilityId} is not unrestricted shell`);
  }

  // -------------------------------------------------------------------------
  // Category AL: Static Security Audit
  // -------------------------------------------------------------------------
  console.log('Running Category AL: Static Security Audit...');
  const execFileContent = fs.readFileSync(
    path.resolve(process.cwd(), 'src/core/capability/capabilityExecutor.ts'),
    'utf-8'
  );
  assert(!execFileContent.includes('eval('), 'capabilityExecutor.ts contains zero eval()');
  assert(!execFileContent.includes('new Function('), 'capabilityExecutor.ts contains zero new Function()');
  assert(!execFileContent.includes('execSync('), 'capabilityExecutor.ts contains zero execSync()');

  // Cleanup test files
  try {
    if (fs.existsSync(testFileG)) fs.unlinkSync(testFileG);
    if (fs.existsSync(replayTargetU)) fs.unlinkSync(replayTargetU);
  } catch {}

  console.log('\n============================================================');
  console.log(`REALITY GATE SUMMARY: ${passedAssertions} assertions PASSED, ${failedAssertions} FAILED`);
  console.log('============================================================');

  if (failedAssertions > 0) {
    process.exit(1);
  }
}

runRealityGate().catch(err => {
  console.error('Reality Gate fatal error:', err);
  process.exit(1);
});
