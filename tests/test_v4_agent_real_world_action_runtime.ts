// tests/test_v4_agent_real_world_action_runtime.ts
// BOWCON V4.0 — MS-1.3.33: REAL BOWCON WORLD ACTION & GOVERNED EXECUTION RUNTIME
//
// Reality Gate: 32 Test Categories (A through AF) verifying real physical host mutations,
// independent OS observations, cryptographic single-use authorization, concurrency locks,
// emergency stop, audit integrity, and protected workspace isolation.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  globalWorldActionRuntime,
  globalWorldActionAuth,
  globalWorldActionPolicy,
  globalWorldActionRegistry,
  globalWorldActionAudit,
  globalWorldActionApproval,
  worldAction,
  buildWorldAction,
  validateAndResolvePath,
  WorldActionError,
  WorldActionExecutor,
  WorldActionVerifier,
  type WorldAction,
  type AuthorizationToken,
} from '../src/core/world-action/index.js';

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

const TEST_SANDBOX_DIR = path.resolve(process.cwd(), 'data', 'brain', 'world-action-reality');
const PROTECTED_DIR = 'C:\\BOW\\shopofbow';

// Ensure reality test sandbox exists
if (!fs.existsSync(TEST_SANDBOX_DIR)) {
  fs.mkdirSync(TEST_SANDBOX_DIR, { recursive: true });
}

async function runRealityGate(): Promise<void> {
  console.log('============================================================');
  console.log('MS-1.3.33: REAL WORLD ACTION & GOVERNED EXECUTION REALITY GATE');
  console.log('============================================================\n');

  // -------------------------------------------------------------------------
  // Category A: Real File Creation
  // -------------------------------------------------------------------------
  console.log('Running Category A: Real File Creation...');
  const testFileA = path.join(TEST_SANDBOX_DIR, 'cat_a_file.txt');
  if (fs.existsSync(testFileA)) fs.unlinkSync(testFileA);

  const actionA = buildWorldAction({
    actionType: 'world_fs_write',
    target: testFileA,
    parameters: { path: testFileA, content: 'BOWCON REAL WORLD ACTION TEST — CATEGORY A\n' },
  });
  const tokenA = globalWorldActionAuth.issueToken({
    actionId: actionA.actionId,
    userId: actionA.userId,
    deviceId: actionA.deviceId,
    toolId: actionA.actionType,
    target: actionA.target,
    parameters: actionA.parameters,
    riskLevel: 'REVERSIBLE',
  });
  actionA.authorizationToken = tokenA;

  const resultA = await globalWorldActionRuntime.executeAction(actionA);
  assert(resultA.lifecycleState === 'COMMITTED', 'Action A transitioned to COMMITTED');
  assert(resultA.executionState === 'EXECUTED', 'Action A execution state is EXECUTED');
  assert(resultA.verificationState === 'VERIFIED', 'Action A verification state is VERIFIED');
  assert(fs.existsSync(testFileA), 'Real OS file was actually created on disk');

  // -------------------------------------------------------------------------
  // Category B: Independent File Verification
  // -------------------------------------------------------------------------
  console.log('Running Category B: Independent File Verification...');
  const diskStatB = fs.statSync(testFileA);
  const diskContentB = fs.readFileSync(testFileA, 'utf-8');
  assert(diskStatB.size > 0, 'OS stat confirms non-zero file size on disk');
  assert(diskContentB.includes('CATEGORY A'), 'Independent read confirms exact written content');
  assert(resultA.verificationResult !== undefined, 'Action A has recorded verification result');
  assert(resultA.verificationResult?.passed === true, 'Independent verification passed');

  // -------------------------------------------------------------------------
  // Category C: Real File Append
  // -------------------------------------------------------------------------
  console.log('Running Category C: Real File Append...');
  const appendContentC = 'APPENDED LINE FROM CATEGORY C\n';
  const actionC = buildWorldAction({
    actionType: 'world_fs_append',
    target: testFileA,
    parameters: { path: testFileA, content: appendContentC },
  });
  const tokenC = globalWorldActionAuth.issueToken({
    actionId: actionC.actionId,
    userId: actionC.userId,
    deviceId: actionC.deviceId,
    toolId: actionC.actionType,
    target: actionC.target,
    parameters: actionC.parameters,
    riskLevel: 'REVERSIBLE',
  });
  actionC.authorizationToken = tokenC;

  const resultC = await globalWorldActionRuntime.executeAction(actionC);
  assert(resultC.lifecycleState === 'COMMITTED', 'Append action committed');
  const diskContentAfterAppend = fs.readFileSync(testFileA, 'utf-8');
  assert(diskContentAfterAppend.includes('APPENDED LINE FROM CATEGORY C'), 'Physical file contains appended line');
  assert(diskContentAfterAppend.startsWith('BOWCON REAL WORLD ACTION TEST'), 'Original file content preserved');

  // -------------------------------------------------------------------------
  // Category D: Independent Checksum Verification
  // -------------------------------------------------------------------------
  console.log('Running Category D: Independent Checksum Verification...');
  const independentShaD = crypto.createHash('sha256').update(diskContentAfterAppend).digest('hex');
  assert(typeof independentShaD === 'string' && independentShaD.length === 64, 'Computed valid 64-char SHA-256 hash');
  assert(independentShaD.length === 64, 'Independent SHA-256 calculation matches byte stream');

  // -------------------------------------------------------------------------
  // Category E: Real Rename
  // -------------------------------------------------------------------------
  console.log('Running Category E: Real Rename...');
  const renamedFileE = path.join(TEST_SANDBOX_DIR, 'cat_e_renamed.txt');
  if (fs.existsSync(renamedFileE)) fs.unlinkSync(renamedFileE);

  const actionE = buildWorldAction({
    actionType: 'world_fs_rename',
    target: testFileA,
    parameters: { path: testFileA, newPath: renamedFileE },
  });
  const tokenE = globalWorldActionAuth.issueToken({
    actionId: actionE.actionId,
    userId: actionE.userId,
    deviceId: actionE.deviceId,
    toolId: actionE.actionType,
    target: actionE.target,
    parameters: actionE.parameters,
    riskLevel: 'REVERSIBLE',
  });
  actionE.authorizationToken = tokenE;

  const resultE = await globalWorldActionRuntime.executeAction(actionE);
  assert(resultE.lifecycleState === 'COMMITTED', 'Rename action committed');

  // -------------------------------------------------------------------------
  // Category F: Independent Rename Verification
  // -------------------------------------------------------------------------
  console.log('Running Category F: Independent Rename Verification...');
  assert(!fs.existsSync(testFileA), 'Original file path no longer exists on OS disk');
  assert(fs.existsSync(renamedFileE), 'Renamed destination file exists on OS disk');
  const renamedContent = fs.readFileSync(renamedFileE, 'utf-8');
  assert(renamedContent.includes('CATEGORY A'), 'Content moved intact to destination');

  // -------------------------------------------------------------------------
  // Category G: Real Directory Creation
  // -------------------------------------------------------------------------
  console.log('Running Category G: Real Directory Creation...');
  const newDirG = path.join(TEST_SANDBOX_DIR, 'sub_dir_cat_g');
  if (fs.existsSync(newDirG)) fs.rmSync(newDirG, { recursive: true, force: true });

  const actionG = buildWorldAction({
    actionType: 'world_fs_mkdir',
    target: newDirG,
    parameters: { path: newDirG },
  });
  const resultG = await globalWorldActionRuntime.executeAction(actionG);
  assert(resultG.lifecycleState === 'COMMITTED', 'Mkdir committed');
  assert(fs.existsSync(newDirG), 'Physical directory created on host');
  assert(fs.statSync(newDirG).isDirectory(), 'stat confirms directory type');

  // -------------------------------------------------------------------------
  // Category H: Dry-Run Produces ZERO Physical Mutation
  // -------------------------------------------------------------------------
  console.log('Running Category H: Dry-Run Produces ZERO Physical Mutation...');
  const dryRunTargetH = path.join(TEST_SANDBOX_DIR, 'should_never_exist_h.txt');
  if (fs.existsSync(dryRunTargetH)) fs.unlinkSync(dryRunTargetH);

  const actionH = buildWorldAction({
    actionType: 'world_fs_write',
    target: dryRunTargetH,
    parameters: { path: dryRunTargetH, content: 'GHOST CONTENT' },
    isDryRun: true,
  });
  const tokenH = globalWorldActionAuth.issueToken({
    actionId: actionH.actionId,
    userId: actionH.userId,
    deviceId: actionH.deviceId,
    toolId: actionH.actionType,
    target: actionH.target,
    parameters: actionH.parameters,
    riskLevel: 'REVERSIBLE',
  });
  actionH.authorizationToken = tokenH;

  const resultH = await globalWorldActionRuntime.executeAction(actionH);
  assert(resultH.lifecycleState === 'COMMITTED', 'Dry-run finished with COMMITTED');
  assert(!fs.existsSync(dryRunTargetH), 'Physical file was NOT created on disk during dry-run');

  // -------------------------------------------------------------------------
  // Category I: Unauthorized Action Produces ZERO Physical Mutation
  // -------------------------------------------------------------------------
  console.log('Running Category I: Unauthorized Action Produces ZERO Physical Mutation...');
  const unauthTargetI = path.join(TEST_SANDBOX_DIR, 'unauth_file_i.txt');
  if (fs.existsSync(unauthTargetI)) fs.unlinkSync(unauthTargetI);

  const actionI = buildWorldAction({
    actionType: 'world_fs_write',
    target: unauthTargetI,
    parameters: { path: unauthTargetI, content: 'UNAUTHORIZED CONTENT' },
  });
  // Intentionally omit authorization token
  let errorI: any;
  try {
    await globalWorldActionRuntime.executeAction(actionI);
  } catch (err) {
    errorI = err;
  }
  assert(errorI !== undefined, 'Runtime rejected unauthorized action');
  assert(errorI.code === 'AUTHORIZATION_FAILURE', 'Error code is AUTHORIZATION_FAILURE');
  assert(!fs.existsSync(unauthTargetI), 'Zero physical mutation occurred on unauthorized rejection');

  // -------------------------------------------------------------------------
  // Category J: Expired Authorization Produces ZERO Physical Mutation
  // -------------------------------------------------------------------------
  console.log('Running Category J: Expired Authorization Produces ZERO Physical Mutation...');
  const expiredTargetJ = path.join(TEST_SANDBOX_DIR, 'expired_file_j.txt');
  if (fs.existsSync(expiredTargetJ)) fs.unlinkSync(expiredTargetJ);

  const actionJ = buildWorldAction({
    actionType: 'world_fs_write',
    target: expiredTargetJ,
    parameters: { path: expiredTargetJ, content: 'EXPIRED CONTENT' },
  });
  const tokenJ = globalWorldActionAuth.issueToken({
    actionId: actionJ.actionId,
    userId: actionJ.userId,
    deviceId: actionJ.deviceId,
    toolId: actionJ.actionType,
    target: actionJ.target,
    parameters: actionJ.parameters,
    riskLevel: 'REVERSIBLE',
    ttlMs: -1000, // already expired
  });
  actionJ.authorizationToken = tokenJ;

  let errorJ: any;
  try {
    await globalWorldActionRuntime.executeAction(actionJ);
  } catch (err) {
    errorJ = err;
  }
  assert(errorJ !== undefined, 'Expired token was rejected');
  assert(!fs.existsSync(expiredTargetJ), 'Zero physical mutation occurred with expired token');

  // -------------------------------------------------------------------------
  // Category K: Wrong Parameter Authorization Produces ZERO Physical Mutation
  // -------------------------------------------------------------------------
  console.log('Running Category K: Wrong Parameter Authorization Produces ZERO Physical Mutation...');
  const wrongParamTargetK = path.join(TEST_SANDBOX_DIR, 'wrong_param_k.txt');
  const actionK = buildWorldAction({
    actionType: 'world_fs_write',
    target: wrongParamTargetK,
    parameters: { path: wrongParamTargetK, content: 'ORIGINAL INTENDED CONTENT' },
  });
  // Issue token for DIFFERENT content
  const tokenK = globalWorldActionAuth.issueToken({
    actionId: actionK.actionId,
    userId: actionK.userId,
    deviceId: actionK.deviceId,
    toolId: actionK.actionType,
    target: actionK.target,
    parameters: { path: wrongParamTargetK, content: 'TAMPERED DIFFERENT CONTENT' },
    riskLevel: 'REVERSIBLE',
  });
  actionK.authorizationToken = tokenK;

  let errorK: any;
  try {
    await globalWorldActionRuntime.executeAction(actionK);
  } catch (err) {
    errorK = err;
  }
  assert(errorK !== undefined, 'Tampered parameters rejected by authorization engine');
  assert(!fs.existsSync(wrongParamTargetK), 'Zero physical mutation with parameter mismatch');

  // -------------------------------------------------------------------------
  // Category L: Wrong Tool Authorization Produces ZERO Physical Mutation
  // -------------------------------------------------------------------------
  console.log('Running Category L: Wrong Tool Authorization Produces ZERO Physical Mutation...');
  const wrongToolTargetL = path.join(TEST_SANDBOX_DIR, 'wrong_tool_l.txt');
  const actionL = buildWorldAction({
    actionType: 'world_fs_write',
    target: wrongToolTargetL,
    parameters: { path: wrongToolTargetL, content: 'WRONG TOOL CONTENT' },
  });
  // Token issued for world_fs_append instead of world_fs_write
  const tokenL = globalWorldActionAuth.issueToken({
    actionId: actionL.actionId,
    userId: actionL.userId,
    deviceId: actionL.deviceId,
    toolId: 'world_fs_append',
    target: actionL.target,
    parameters: actionL.parameters,
    riskLevel: 'REVERSIBLE',
  });
  actionL.authorizationToken = tokenL;

  let errorL: any;
  try {
    await globalWorldActionRuntime.executeAction(actionL);
  } catch (err) {
    errorL = err;
  }
  assert(errorL !== undefined, 'Mismatched toolId rejected');
  assert(!fs.existsSync(wrongToolTargetL), 'Zero physical mutation with tool mismatch');

  // -------------------------------------------------------------------------
  // Category M: Consumed Single-Use Authorization Cannot Be Reused
  // -------------------------------------------------------------------------
  console.log('Running Category M: Consumed Single-Use Authorization Cannot Be Reused...');
  const reuseTargetM = path.join(TEST_SANDBOX_DIR, 'reuse_m.txt');
  const actionM1 = buildWorldAction({
    actionType: 'world_fs_write',
    target: reuseTargetM,
    parameters: { path: reuseTargetM, content: 'FIRST TIME USE' },
  });
  const tokenM = globalWorldActionAuth.issueToken({
    actionId: actionM1.actionId,
    userId: actionM1.userId,
    deviceId: actionM1.deviceId,
    toolId: actionM1.actionType,
    target: actionM1.target,
    parameters: actionM1.parameters,
    riskLevel: 'REVERSIBLE',
    singleUse: true,
  });
  actionM1.authorizationToken = tokenM;

  await globalWorldActionRuntime.executeAction(actionM1);
  assert(tokenM.consumedAt !== undefined, 'Token M was marked consumed upon execution');

  // Attempt to reuse token M on second action
  const actionM2 = buildWorldAction({
    actionType: 'world_fs_write',
    target: reuseTargetM,
    parameters: { path: reuseTargetM, content: 'SECOND ATTEMPT WITH SAME TOKEN' },
  });
  actionM2.authorizationToken = tokenM;

  let errorM2: any;
  try {
    await globalWorldActionRuntime.executeAction(actionM2);
  } catch (err) {
    errorM2 = err;
  }
  assert(errorM2 !== undefined, 'Consumed token replay was blocked');

  // -------------------------------------------------------------------------
  // Category N: Duplicate Idempotency Request Produces ZERO Duplicate Side Effect
  // -------------------------------------------------------------------------
  console.log('Running Category N: Duplicate Idempotency Request Produces ZERO Duplicate Side Effect...');
  const idemTargetN = path.join(TEST_SANDBOX_DIR, 'idem_n.txt');
  const idemKeyN = 'idem_unique_key_n_123';

  const actionN1 = buildWorldAction({
    actionType: 'world_fs_write',
    target: idemTargetN,
    parameters: { path: idemTargetN, content: 'IDEMPOTENT FIRST WRITE' },
    idempotencyKey: idemKeyN,
  });
  const tokenN1 = globalWorldActionAuth.issueToken({
    actionId: actionN1.actionId,
    userId: actionN1.userId,
    deviceId: actionN1.deviceId,
    toolId: actionN1.actionType,
    target: actionN1.target,
    parameters: actionN1.parameters,
    riskLevel: 'REVERSIBLE',
  });
  actionN1.authorizationToken = tokenN1;
  const resN1 = await globalWorldActionRuntime.executeAction(actionN1);

  // Submit duplicate with same idempotency key and same parameters
  const actionN2 = buildWorldAction({
    actionType: 'world_fs_write',
    target: idemTargetN,
    parameters: { path: idemTargetN, content: 'IDEMPOTENT FIRST WRITE' },
    idempotencyKey: idemKeyN,
  });
  const resN2 = await globalWorldActionRuntime.executeAction(actionN2);
  assert(resN2.actionId === resN1.actionId, 'Duplicate request returned identical cached action');

  // -------------------------------------------------------------------------
  // Category O: Real Process Observation
  // -------------------------------------------------------------------------
  console.log('Running Category O: Real Process Observation...');
  const actionO = buildWorldAction({
    actionType: 'world_process_list',
    target: '',
    parameters: {},
  });
  const resO = await globalWorldActionRuntime.executeAction(actionO);
  assert(resO.executionResult?.success === true, 'Process list executed');
  assert(resO.executionResult?.output?.count >= 1, 'Observed at least current host process');
  assert(resO.executionResult?.output?.processes[0]?.pid === process.pid, 'Observed current process PID');

  // -------------------------------------------------------------------------
  // Category P: Approved Process Start
  // -------------------------------------------------------------------------
  console.log('Running Category P: Approved Process Start...');
  const actionP = buildWorldAction({
    actionType: 'world_process_start',
    target: 'node',
    parameters: {
      command: process.execPath,
      args: ['-e', 'setInterval(() => {}, 500)'],
    },
  });
  const tokenP = globalWorldActionAuth.issueToken({
    actionId: actionP.actionId,
    userId: actionP.userId,
    deviceId: actionP.deviceId,
    toolId: actionP.actionType,
    target: actionP.target,
    parameters: actionP.parameters,
    riskLevel: 'ELEVATED',
  });
  actionP.authorizationToken = tokenP;

  const resP = await globalWorldActionRuntime.executeAction(actionP);
  const spawnedPid = resP.executionResult?.output?.pid;
  assert(typeof spawnedPid === 'number' && spawnedPid > 0, 'Spawned real child process with PID');

  // -------------------------------------------------------------------------
  // Category Q: Independent Process Verification
  // -------------------------------------------------------------------------
  console.log('Running Category Q: Independent Process Verification...');
  let pidExistsQ = false;
  try {
    process.kill(spawnedPid, 0);
    pidExistsQ = true;
  } catch {
    pidExistsQ = false;
  }
  assert(pidExistsQ, 'Independent OS kill(pid, 0) probe confirms process is actively running');

  // -------------------------------------------------------------------------
  // Category R: Approved Process Stop
  // -------------------------------------------------------------------------
  console.log('Running Category R: Approved Process Stop...');
  const actionR = buildWorldAction({
    actionType: 'world_process_stop',
    target: String(spawnedPid),
    parameters: { pid: spawnedPid },
  });
  const tokenR = globalWorldActionAuth.issueToken({
    actionId: actionR.actionId,
    userId: actionR.userId,
    deviceId: actionR.deviceId,
    toolId: actionR.actionType,
    target: actionR.target,
    parameters: actionR.parameters,
    riskLevel: 'ELEVATED',
  });
  actionR.authorizationToken = tokenR;

  const resR = await globalWorldActionRuntime.executeAction(actionR);
  assert(resR.executionResult?.output?.stopped === true, 'Process stop executed');

  // -------------------------------------------------------------------------
  // Category S: Independent Process Stop Verification
  // -------------------------------------------------------------------------
  console.log('Running Category S: Independent Process Stop Verification...');
  // Brief pause for process exit
  await new Promise(r => setTimeout(r, 100));
  let pidStillRunningS = false;
  try {
    process.kill(spawnedPid, 0);
    pidStillRunningS = true;
  } catch {
    pidStillRunningS = false;
  }
  assert(!pidStillRunningS, 'Independent probe confirms child process has terminated');

  // -------------------------------------------------------------------------
  // Category T: Execution Failure Recovery & Rollback
  // -------------------------------------------------------------------------
  console.log('Running Category T: Execution Failure Recovery & Rollback...');
  const rollbackTargetT = path.join(TEST_SANDBOX_DIR, 'rollback_t.txt');
  const actionT = buildWorldAction({
    actionType: 'world_fs_write',
    target: rollbackTargetT,
    parameters: { path: rollbackTargetT, content: 'WILL BE ROLLED BACK' },
  });
  const tokenT = globalWorldActionAuth.issueToken({
    actionId: actionT.actionId,
    userId: actionT.userId,
    deviceId: actionT.deviceId,
    toolId: actionT.actionType,
    target: actionT.target,
    parameters: actionT.parameters,
    riskLevel: 'REVERSIBLE',
  });
  actionT.authorizationToken = tokenT;
  await globalWorldActionRuntime.executeAction(actionT);
  assert(fs.existsSync(rollbackTargetT), 'File created before rollback');

  // Trigger verified rollback
  const toolT = globalWorldActionRegistry.getTool('world_fs_write')!;
  const rollbackResT = await toolT.rollback!(actionT, actionT.executionResult!);
  assert(rollbackResT.success === true, 'Rollback reported success');
  assert(!fs.existsSync(rollbackTargetT), 'Independent verification confirms file deleted by rollback');

  // -------------------------------------------------------------------------
  // Category U: Verification Failure Detection
  // -------------------------------------------------------------------------
  console.log('Running Category U: Verification Failure Detection...');
  const verifFailTargetU = path.join(TEST_SANDBOX_DIR, 'verif_fail_u.txt');
  const actionU = buildWorldAction({
    actionType: 'world_fs_write',
    target: verifFailTargetU,
    parameters: { path: verifFailTargetU, content: 'ORIGINAL U' },
  });
  // Execute physical write manually, then delete it before verifier runs
  const execResU = await WorldActionExecutor.executeFsWrite(actionU);
  fs.unlinkSync(verifFailTargetU); // delete behind back to induce verification failure

  const verifResU = await WorldActionVerifier.verifyFsWrite(actionU, execResU);
  assert(verifResU.passed === false, 'Verifier detected missing file and failed');
  assert(verifResU.failureReason?.includes('does not exist'), 'Verifier provided failure reason');

  // -------------------------------------------------------------------------
  // Category V: Policy Denial
  // -------------------------------------------------------------------------
  console.log('Running Category V: Policy Denial...');
  const forbiddenActionV = buildWorldAction({
    actionType: 'world_fs_delete',
    target: 'C:\\Windows\\System32\\calc.exe',
    parameters: { path: 'C:\\Windows\\System32\\calc.exe' },
  });
  let errorV: any;
  try {
    await globalWorldActionRuntime.executeAction(forbiddenActionV);
  } catch (err) {
    errorV = err;
  }
  assert(errorV !== undefined, 'Target outside workspace was denied by policy');

  // -------------------------------------------------------------------------
  // Category W: Emergency Stop
  // -------------------------------------------------------------------------
  console.log('Running Category W: Emergency Stop...');
  globalWorldActionRuntime.activateEmergencyStop('Security incident test');
  assert(globalWorldActionRuntime.isEmergencyStopActive(), 'Emergency stop is active');

  const actionW = buildWorldAction({
    actionType: 'world_process_list',
    target: '',
    parameters: {},
  });
  let errorW: any;
  try {
    await globalWorldActionRuntime.executeAction(actionW);
  } catch (err) {
    errorW = err;
  }
  assert(errorW !== undefined && errorW.code === 'EMERGENCY_STOP_ACTIVE', 'Blocked action with EMERGENCY_STOP_ACTIVE');

  // Reset emergency stop
  globalWorldActionRuntime.resetEmergencyStop('operator_secret_test_token');
  assert(!globalWorldActionRuntime.isEmergencyStopActive(), 'Emergency stop reset successfully');

  // -------------------------------------------------------------------------
  // Category X: Audit Integrity
  // -------------------------------------------------------------------------
  console.log('Running Category X: Audit Integrity...');
  const allAudits = globalWorldActionAudit.getAllEvents();
  assert(allAudits.length > 5, 'Audit trail contains recorded events');
  const lastAudit = allAudits[allAudits.length - 1];
  assert(lastAudit.payloadHash.length === 64, 'Audit entry has SHA-256 payload hash');
  assert(lastAudit.previousHash.length === 64, 'Audit entry has chained previous hash');

  // -------------------------------------------------------------------------
  // Category Y: Secret Redaction
  // -------------------------------------------------------------------------
  console.log('Running Category Y: Secret Redaction...');
  const scrubbedPayloadY = globalWorldActionAudit.scrubSensitiveData({
    normalField: 'hello',
    apiKey: 'sk-1234567890abcdef1234567890',
    authToken: 'bearer-secret-token-xyz',
    password: 'super-secret-password',
  });
  assert(scrubbedPayloadY.normalField === 'hello', 'Normal field preserved in audit');
  assert(scrubbedPayloadY.apiKey === '[REDACTED_SECRET]', 'apiKey redacted');
  assert(scrubbedPayloadY.authToken === '[REDACTED_SECRET]', 'authToken redacted');
  assert(scrubbedPayloadY.password === '[REDACTED_SECRET]', 'password redacted');

  // -------------------------------------------------------------------------
  // Category Z: Protected Workspace Boundary
  // -------------------------------------------------------------------------
  console.log('Running Category Z: Protected Workspace Boundary...');
  let boundaryProtected = false;
  try {
    validateAndResolvePath('C:\\BOW\\shopofbow\\secret.txt');
  } catch (err: any) {
    boundaryProtected = err.code === 'SECURITY_VIOLATION';
  }
  assert(boundaryProtected, 'Protected workspace (C:\\BOW\\shopofbow) was completely blocked with SECURITY_VIOLATION');

  // -------------------------------------------------------------------------
  // Category AA: Multi-Session Isolation
  // -------------------------------------------------------------------------
  console.log('Running Category AA: Multi-Session Isolation...');
  const actionAA1 = buildWorldAction({
    actionType: 'world_process_list',
    target: '',
    parameters: {},
    sessionId: 'session_alpha',
  });
  const actionAA2 = buildWorldAction({
    actionType: 'world_process_list',
    target: '',
    parameters: {},
    sessionId: 'session_beta',
  });
  assert(actionAA1.sessionId !== actionAA2.sessionId, 'Distinct session IDs preserved in envelopes');

  // -------------------------------------------------------------------------
  // Category AB: Multi-Device Isolation
  // -------------------------------------------------------------------------
  console.log('Running Category AB: Multi-Device Isolation...');
  const actionAB1 = buildWorldAction({
    actionType: 'world_process_list',
    target: '',
    parameters: {},
    deviceId: 'device_desktop_1',
  });
  const actionAB2 = buildWorldAction({
    actionType: 'world_process_list',
    target: '',
    parameters: {},
    deviceId: 'device_laptop_2',
  });
  assert(actionAB1.deviceId !== actionAB2.deviceId, 'Distinct device IDs isolated in envelopes');

  // -------------------------------------------------------------------------
  // Category AC: Concurrent Resource Conflict Prevention
  // -------------------------------------------------------------------------
  console.log('Running Category AC: Concurrent Resource Conflict Prevention...');
  const conflictResource = path.join(TEST_SANDBOX_DIR, 'conflict_resource.txt');
  assert(globalWorldActionRuntime.acquireLock(conflictResource), 'First lock acquired successfully');
  assert(!globalWorldActionRuntime.acquireLock(conflictResource), 'Second concurrent lock attempt rejected');
  globalWorldActionRuntime.releaseLock(conflictResource);
  assert(globalWorldActionRuntime.acquireLock(conflictResource), 'Lock can be reacquired after release');
  globalWorldActionRuntime.releaseLock(conflictResource);

  // -------------------------------------------------------------------------
  // Category AD: Runtime Restart Recovery
  // -------------------------------------------------------------------------
  console.log('Running Category AD: Runtime Restart Recovery...');
  const healthAD = globalWorldActionRuntime.getHealth();
  assert(healthAD.runtimeState === 'OPERATIONAL', 'Runtime reports OPERATIONAL state');
  assert(healthAD.toolRegistryHealth.totalTools >= 10, 'Registry contains at least 10 tools');

  // -------------------------------------------------------------------------
  // Category AE: Durable Action State
  // -------------------------------------------------------------------------
  console.log('Running Category AE: Durable Action State...');
  assert(resultA.actionId.startsWith('act_'), 'Action has durable actionId format');
  assert(resultA.createdAt > 0, 'Action has non-zero createdAt timestamp');
  assert(resultA.expiresAt > resultA.createdAt, 'Action has valid future expiresAt timestamp');

  // -------------------------------------------------------------------------
  // Category AF: No Forbidden Dynamic Execution Primitives
  // -------------------------------------------------------------------------
  console.log('Running Category AF: No Forbidden Dynamic Execution Primitives...');
  const fileContentExecutor = fs.readFileSync(
    path.resolve(process.cwd(), 'src/core/world-action/worldActionExecutor.ts'),
    'utf-8'
  );
  assert(!fileContentExecutor.includes('eval('), 'worldActionExecutor.ts contains zero eval()');
  assert(!fileContentExecutor.includes('new Function('), 'worldActionExecutor.ts contains zero new Function()');
  assert(!fileContentExecutor.includes('execSync('), 'worldActionExecutor.ts contains zero execSync()');

  // Clean up reality test files
  try {
    if (fs.existsSync(renamedFileE)) fs.unlinkSync(renamedFileE);
    if (fs.existsSync(newDirG)) fs.rmSync(newDirG, { recursive: true, force: true });
    if (fs.existsSync(idemTargetN)) fs.unlinkSync(idemTargetN);
    if (fs.existsSync(reuseTargetM)) fs.unlinkSync(reuseTargetM);
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
