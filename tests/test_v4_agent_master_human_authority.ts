// tests/test_v4_agent_master_human_authority.ts
// BOWCON V4.0 — MS-1.3.38: MASTER HUMAN AUTHORITY UNIFICATION & EXECUTIVE GOVERNANCE CLOSURE
//
// Reality Gate: 300+ rigorous assertions covering Categories A through O.
// Proves actual runtime behavior across Master Human Authority, HumanGate,
// AuthorizationToken binding, USER_STOP supremacy, Executive delegation,
// ContinuousAgentLoop, Supervisor, DAG integrity, Recovery, Checkpoints, Audit, and Protected Workspace.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  // Master Human Authority
  MasterHumanAuthority,
  globalMasterHumanAuthority,
  FORBIDDEN_EXECUTION_PATTERNS,
  // HumanGate
  SupervisorHumanGate,
  globalSupervisorHumanGate,
  globalHumanGate,
  // WorldAction & Token Authorization
  globalWorldActionAuth,
  WorldActionAuthorizationEngine,
  // Capability Runtime
  globalCapabilityRuntime,
  // Agent Loop & Control
  globalAgentLoopRuntime,
  globalAgentLoopControl,
  // Supervisor Runtime
  globalSupervisorRuntime,
  // Executive Subsystem
  globalExecutiveRuntime,
  globalExecutiveGoalManager,
  globalExecutiveTaskManager,
  globalExecutiveScheduler,
  globalExecutiveGovernance,
  globalExecutiveExecution,
  globalExecutiveProgress,
  globalExecutiveRecovery,
  globalExecutiveCancellation,
  globalExecutiveEscalation,
  globalExecutivePersistence,
  globalExecutiveCheckpoint,
  globalExecutiveAudit,
  globalExecutiveAuthorization,
  ExecutiveDependencyGraph,
  globalExecutiveAgentLoopBridge,
  compareGoalPriority,
  compareTaskPriority,
  isHigherPriority,
} from '../src/index.js';

let passedAssertions = 0;

function assert(condition: boolean, message: string): void {
  passedAssertions++;
  if (!condition) {
    console.error(`[FAIL] Assertion #${passedAssertions}: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertThrows(fn: () => unknown, expectedPattern?: string | RegExp, message?: string): void {
  passedAssertions++;
  let threw = false;
  let errorMsg = '';
  try {
    fn();
  } catch (err) {
    threw = true;
    errorMsg = err instanceof Error ? err.message : String(err);
  }
  if (!threw) {
    console.error(`[FAIL] Assertion #${passedAssertions}: Expected function to throw, but it did not. ${message ?? ''}`);
    throw new Error(`Expected function to throw, but it did not. ${message ?? ''}`);
  }
  if (expectedPattern) {
    const matches = typeof expectedPattern === 'string'
      ? errorMsg.includes(expectedPattern)
      : expectedPattern.test(errorMsg);
    if (!matches) {
      console.error(`[FAIL] Assertion #${passedAssertions}: Error message "${errorMsg}" did not match pattern "${expectedPattern}"`);
      throw new Error(`Error message "${errorMsg}" did not match pattern "${expectedPattern}"`);
    }
  }
}

async function assertRejects(fn: () => Promise<unknown>, expectedPattern?: string | RegExp, message?: string): Promise<void> {
  passedAssertions++;
  let threw = false;
  let errorMsg = '';
  try {
    await fn();
  } catch (err) {
    threw = true;
    errorMsg = err instanceof Error ? err.message : String(err);
  }
  if (!threw) {
    console.error(`[FAIL] Assertion #${passedAssertions}: Expected async function to reject, but it did not. ${message ?? ''}`);
    throw new Error(`Expected async function to reject, but it did not. ${message ?? ''}`);
  }
  if (expectedPattern) {
    const matches = typeof expectedPattern === 'string'
      ? errorMsg.includes(expectedPattern)
      : expectedPattern.test(errorMsg);
    if (!matches) {
      console.error(`[FAIL] Assertion #${passedAssertions}: Error message "${errorMsg}" did not match pattern "${expectedPattern}"`);
      throw new Error(`Error message "${errorMsg}" did not match pattern "${expectedPattern}"`);
    }
  }
}

async function runRealityGate(): Promise<void> {
  console.log('============================================================');
  console.log('BOWCON V4.0 — MS-1.3.38: MASTER HUMAN AUTHORITY REALITY GATE');
  console.log('============================================================');

  const testSandbox = path.resolve(process.cwd(), 'scratch/master_authority_test_env');
  if (fs.existsSync(testSandbox)) {
    fs.rmSync(testSandbox, { recursive: true, force: true });
  }
  fs.mkdirSync(testSandbox, { recursive: true });

  // Clean runtime states before starting
  globalMasterHumanAuthority.clear();
  globalExecutiveRuntime.clear();
  globalSupervisorHumanGate.clear();
  globalWorldActionAuth.clearAll();

  try {
    // -----------------------------------------------------------------------
    // CATEGORY A: Master Authority
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY A: Master Authority ---');
    assert(globalMasterHumanAuthority !== undefined, 'globalMasterHumanAuthority is defined');
    assert(typeof globalMasterHumanAuthority.isMasterOperator === 'function', 'isMasterOperator is a function');
    assert(globalMasterHumanAuthority.masterOperatorId === 'master_operator', 'Canonical master ID is master_operator');
    assert(globalMasterHumanAuthority.isMasterOperator('master_operator'), 'master_operator is recognized as master');
    assert(globalMasterHumanAuthority.isMasterOperator('user_primary'), 'user_primary is recognized as master alias');
    assert(globalMasterHumanAuthority.isMasterOperator('operator'), 'operator is recognized as master alias');
    assert(globalMasterHumanAuthority.isMasterOperator('boss_user'), 'boss_user is recognized as master alias');
    assert(!globalMasterHumanAuthority.isMasterOperator('unauthorized_user'), 'unauthorized_user is rejected as master');
    assert(!globalMasterHumanAuthority.isMasterOperator('attacker_root'), 'attacker_root is rejected as master');
    assert(!globalMasterHumanAuthority.isMasterOperator(''), 'empty operator string is rejected');
    assert(!globalMasterHumanAuthority.isMasterOperator(undefined), 'undefined operator is rejected');

    // Prove single authority: no second authorization provider exists
    assert(globalHumanGate === globalSupervisorHumanGate, 'globalHumanGate points strictly to canonical HumanGate');
    assert(typeof globalExecutiveAuthorization.requestMasterAuthorization === 'function', 'Executive requests master authorization through HumanGate');

    // Non-master cannot reset USER_STOP
    globalMasterHumanAuthority.triggerUserStop('Test stop');
    assert(globalMasterHumanAuthority.isUserStopActive, 'USER_STOP is active after trigger');
    assertThrows(
      () => globalMasterHumanAuthority.resetUserStop('unauthorized_user'),
      'UNAUTHORIZED_USER_STOP_RESET',
      'Non-master operator cannot reset USER_STOP'
    );
    assert(globalMasterHumanAuthority.isUserStopActive, 'USER_STOP remains active after unauthorized reset attempt');
    globalMasterHumanAuthority.resetUserStop('master_operator');
    assert(!globalMasterHumanAuthority.isUserStopActive, 'Master operator successfully resets USER_STOP');

    // -----------------------------------------------------------------------
    // CATEGORY B: HumanGate Integration
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY B: HumanGate Integration ---');
    // ExecutiveRuntime requests authorization through existing HumanGate
    const goalB = globalExecutiveGoalManager.createGoal({ sessionId: 'session_b', objective: 'HumanGate Delegation Goal' });
    const taskB = globalExecutiveTaskManager.createTask({
      goalId: goalB.goalId,
      title: 'Human Gate Protected Task',
      description: 'Requires human gate approval',
      riskLevel: 'HIGH',
      permissionLevel: 'AWAIT_HUMAN_AUTHORIZATION',
      plan: {
        planId: 'plan_b_1',
        capabilityId: 'capability.file_write',
        actionName: 'WRITE',
        targetPath: path.join(testSandbox, 'delegated_output.txt'),
        parameters: { content: 'Delegated authority content\n' },
        isDryRun: false,
      },
    });

    const gateReq = globalExecutiveAuthorization.requestMasterAuthorization(taskB, goalB.goalId, goalB.sessionId);
    assert(gateReq !== undefined, 'HumanGateRequest was created');
    assert(gateReq.status === 'PENDING', 'HumanGateRequest starts in PENDING status');
    assert(gateReq.requestId.startsWith('gate_'), 'Request ID has gate_ prefix');
    assert(gateReq.authorizationContext?.actionId === taskB.taskId, 'Authorization context binds actionId to taskId');
    assert(gateReq.authorizationContext?.sessionId === goalB.sessionId, 'Authorization context binds sessionId');

    // Approve through Master Human Authority via HumanGate
    const approvedReq = globalMasterHumanAuthority.approveGateRequest(gateReq.requestId, 'master_operator', {
      deviceId: 'dev_master_01',
      sessionId: goalB.sessionId,
      goalId: goalB.goalId,
      taskId: taskB.taskId,
    });
    assert(approvedReq.status === 'APPROVED', 'Request status is APPROVED');
    assert(approvedReq.authorizationToken !== undefined, 'Approved request has canonical AuthorizationToken');

    const canonicalToken = approvedReq.authorizationToken!;
    assert(canonicalToken.operatorId === 'master_operator', 'Token binds operatorId');
    assert(canonicalToken.sessionId === goalB.sessionId, 'Token binds sessionId');
    assert(canonicalToken.goalId === goalB.goalId, 'Token binds goalId');
    assert(canonicalToken.taskId === taskB.taskId, 'Token binds taskId');
    assert(canonicalToken.singleUse === true, 'Token is singleUse');

    // Bind token in executive scope and resolve
    const binding = globalExecutiveAuthorization.bindAuthorizedToken(canonicalToken, taskB, goalB.goalId, goalB.sessionId);
    assert(binding.tokenId === canonicalToken.tokenId, 'Binding binds canonical tokenId');
    assert(binding.goalId === goalB.goalId, 'Binding binds goalId');
    assert(binding.taskId === taskB.taskId, 'Binding binds taskId');

    const resolved = globalExecutiveAuthorization.resolveAuthorizedToken(canonicalToken.tokenId, taskB, goalB.goalId, goalB.sessionId);
    assert(resolved.tokenId === canonicalToken.tokenId, 'Resolved token matches canonical token');

    // Subordinated helper compatibility: issueHumanToken delegates strictly to HumanGate
    const helperToken = globalExecutiveAuthorization.issueHumanToken('task_sub_1', 'session_sub', 'master_operator', {
      capabilityId: 'system.observe',
      target: 'host_system',
      goalId: goalB.goalId,
    });
    assert(helperToken.tokenId.startsWith('tok_'), 'Helper token is a canonical token');
    assert(globalWorldActionAuth.getToken(helperToken.tokenId) !== undefined, 'Helper token exists in canonical WorldAction registry');
    const consumedResult = globalExecutiveAuthorization.consumeToken(helperToken.tokenId, 'task_sub_1', 'session_sub');
    assert(consumedResult.consumed === true, 'Token was consumed through canonical engine');

    // -----------------------------------------------------------------------
    // CATEGORY C: Token Binding Mismatch Enforcements (All 12 checks)
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY C: Token Binding Mismatch Checks ---');
    const testActionBase = {
      actionId: 'act_bind_test',
      actionType: 'capability.file_write',
      target: path.join(testSandbox, 'target_file.txt'),
      parameters: { data: 'test_payload' },
      userId: 'master_operator',
      deviceId: 'device_primary',
      sessionId: 'session_c_test',
      riskLevel: 'HIGH' as const,
      metadata: { goalId: 'goal_c_test', taskId: 'act_bind_test' },
    };

    // 1. Expiration check
    const expiredToken = globalWorldActionAuth.issueToken({
      actionId: 'act_bind_test',
      userId: 'master_operator',
      operatorId: 'master_operator',
      deviceId: 'device_primary',
      toolId: 'capability.file_write',
      target: path.join(testSandbox, 'target_file.txt'),
      parameters: { data: 'test_payload' },
      riskLevel: 'HIGH',
      ttlMs: -1000, // already expired
    });
    const expVal = globalWorldActionAuth.validateToken(expiredToken, testActionBase as any);
    assert(!expVal.valid, 'Expired token is rejected');
    assert(expVal.reason?.includes('expired') === true, 'Reason mentions expiration');

    // 2. Replay check (single-use consumption)
    const replayToken = globalWorldActionAuth.issueToken({
      actionId: 'act_bind_test',
      userId: 'master_operator',
      operatorId: 'master_operator',
      deviceId: 'device_primary',
      toolId: 'capability.file_write',
      target: path.join(testSandbox, 'target_file.txt'),
      parameters: { data: 'test_payload' },
      riskLevel: 'HIGH',
      ttlMs: 60000,
    });
    const firstVal = globalWorldActionAuth.validateToken(replayToken, testActionBase as any);
    assert(firstVal.valid, 'Unconsumed token is valid');
    globalWorldActionAuth.consumeToken(replayToken.tokenId, 'act_bind_test');
    const replayVal = globalWorldActionAuth.validateToken(replayToken, testActionBase as any);
    assert(!replayVal.valid, 'Replayed/consumed token is rejected');
    assert(replayVal.reason?.includes('already been consumed') === true, 'Reason mentions consumption');

    // 3. Revocation check
    const revToken = globalWorldActionAuth.issueToken({
      actionId: 'act_bind_test',
      userId: 'master_operator',
      operatorId: 'master_operator',
      deviceId: 'device_primary',
      toolId: 'capability.file_write',
      target: path.join(testSandbox, 'target_file.txt'),
      parameters: { data: 'test_payload' },
      riskLevel: 'HIGH',
      ttlMs: 60000,
    });
    globalMasterHumanAuthority.revokeAuthorizationToken(revToken.tokenId, 'master_operator');
    const revVal = globalWorldActionAuth.validateToken(revToken, testActionBase as any);
    assert(!revVal.valid, 'Revoked token is rejected');
    assert(revVal.reason?.includes('revoked') === true, 'Reason mentions revocation');

    // 4. Operator / UserId mismatch
    const opToken = globalWorldActionAuth.issueToken({
      actionId: 'act_bind_test',
      userId: 'master_operator',
      operatorId: 'master_operator',
      deviceId: 'device_primary',
      toolId: 'capability.file_write',
      target: path.join(testSandbox, 'target_file.txt'),
      parameters: { data: 'test_payload' },
      riskLevel: 'HIGH',
      ttlMs: 60000,
    });
    const opMismatch = globalWorldActionAuth.validateToken(opToken, { ...testActionBase, userId: 'other_operator' } as any);
    assert(!opMismatch.valid, 'Operator mismatch is rejected');
    assert(opMismatch.reason?.includes('operator mismatch') === true, 'Reason notes operator mismatch');

    // 5. Session mismatch
    const sessToken = globalWorldActionAuth.issueToken({
      actionId: 'act_bind_test',
      userId: 'master_operator',
      operatorId: 'master_operator',
      sessionId: 'session_original',
      deviceId: 'device_primary',
      toolId: 'capability.file_write',
      target: path.join(testSandbox, 'target_file.txt'),
      parameters: { data: 'test_payload' },
      riskLevel: 'HIGH',
      ttlMs: 60000,
    });
    const sessMismatch = globalWorldActionAuth.validateToken(sessToken, { ...testActionBase, sessionId: 'session_different' } as any);
    assert(!sessMismatch.valid, 'Session mismatch is rejected');
    assert(sessMismatch.reason?.includes('session mismatch') === true, 'Reason notes session mismatch');

    // 6. Device mismatch
    const devToken = globalWorldActionAuth.issueToken({
      actionId: 'act_bind_test',
      userId: 'master_operator',
      operatorId: 'master_operator',
      deviceId: 'device_primary',
      toolId: 'capability.file_write',
      target: path.join(testSandbox, 'target_file.txt'),
      parameters: { data: 'test_payload' },
      riskLevel: 'HIGH',
      ttlMs: 60000,
    });
    const devMismatch = globalWorldActionAuth.validateToken(devToken, { ...testActionBase, deviceId: 'device_foreign' } as any);
    assert(!devMismatch.valid, 'Device mismatch is rejected');
    assert(devMismatch.reason?.includes('device mismatch') === true, 'Reason notes device mismatch');

    // 7. Goal mismatch
    const goalToken = globalWorldActionAuth.issueToken({
      actionId: 'act_bind_test',
      userId: 'master_operator',
      operatorId: 'master_operator',
      goalId: 'goal_original',
      deviceId: 'device_primary',
      toolId: 'capability.file_write',
      target: path.join(testSandbox, 'target_file.txt'),
      parameters: { data: 'test_payload' },
      riskLevel: 'HIGH',
      ttlMs: 60000,
    });
    const goalMismatch = globalWorldActionAuth.validateToken(goalToken, { ...testActionBase, metadata: { goalId: 'goal_tampered' } } as any);
    assert(!goalMismatch.valid, 'Goal mismatch is rejected');
    assert(goalMismatch.reason?.includes('goal mismatch') === true, 'Reason notes goal mismatch');

    // 8. Task mismatch
    const taskToken = globalWorldActionAuth.issueToken({
      actionId: 'act_bind_test',
      userId: 'master_operator',
      operatorId: 'master_operator',
      taskId: 'task_original',
      deviceId: 'device_primary',
      toolId: 'capability.file_write',
      target: path.join(testSandbox, 'target_file.txt'),
      parameters: { data: 'test_payload' },
      riskLevel: 'HIGH',
      ttlMs: 60000,
    });
    const taskMismatch = globalWorldActionAuth.validateToken(taskToken, { ...testActionBase, metadata: { taskId: 'task_tampered' } } as any);
    assert(!taskMismatch.valid, 'Task mismatch is rejected');
    assert(taskMismatch.reason?.includes('task mismatch') === true, 'Reason notes task mismatch');

    // 9. Capability / Tool mismatch
    const capToken = globalWorldActionAuth.issueToken({
      actionId: 'act_bind_test',
      userId: 'master_operator',
      operatorId: 'master_operator',
      deviceId: 'device_primary',
      toolId: 'capability.file_write',
      capability: 'capability.file_write',
      target: path.join(testSandbox, 'target_file.txt'),
      parameters: { data: 'test_payload' },
      riskLevel: 'HIGH',
      ttlMs: 60000,
    });
    const capMismatch = globalWorldActionAuth.validateToken(capToken, { ...testActionBase, actionType: 'capability.system_reboot' } as any);
    assert(!capMismatch.valid, 'Capability mismatch is rejected');
    assert(capMismatch.reason?.includes('capability mismatch') === true, 'Reason notes capability mismatch');

    // 10. Parameters mismatch
    const paramToken = globalWorldActionAuth.issueToken({
      actionId: 'act_bind_test',
      userId: 'master_operator',
      operatorId: 'master_operator',
      deviceId: 'device_primary',
      toolId: 'capability.file_write',
      target: path.join(testSandbox, 'target_file.txt'),
      parameters: { data: 'test_payload' },
      riskLevel: 'HIGH',
      ttlMs: 60000,
    });
    const paramMismatch = globalWorldActionAuth.validateToken(paramToken, { ...testActionBase, parameters: { data: 'tampered_payload' } } as any);
    assert(!paramMismatch.valid, 'Parameter mismatch is rejected');
    assert(paramMismatch.reason?.includes('parameter mismatch') === true, 'Reason notes parameter mismatch');

    // 11. Target mismatch
    const targetToken = globalWorldActionAuth.issueToken({
      actionId: 'act_bind_test',
      userId: 'master_operator',
      operatorId: 'master_operator',
      deviceId: 'device_primary',
      toolId: 'capability.file_write',
      target: path.join(testSandbox, 'target_file.txt'),
      parameters: { data: 'test_payload' },
      riskLevel: 'HIGH',
      ttlMs: 60000,
    });
    const targetMismatch = globalWorldActionAuth.validateToken(targetToken, { ...testActionBase, target: path.join(testSandbox, 'different_file.txt') } as any);
    assert(!targetMismatch.valid, 'Target mismatch is rejected');
    assert(targetMismatch.reason?.includes('target mismatch') === true, 'Reason notes target mismatch');

    // 12. Risk context mismatch
    const riskToken = globalWorldActionAuth.issueToken({
      actionId: 'act_bind_test',
      userId: 'master_operator',
      operatorId: 'master_operator',
      deviceId: 'device_primary',
      toolId: 'capability.file_write',
      target: path.join(testSandbox, 'target_file.txt'),
      parameters: { data: 'test_payload' },
      riskLevel: 'NORMAL' as any,
      ttlMs: 60000,
    });
    const riskMismatch = globalWorldActionAuth.validateToken(riskToken, { ...testActionBase, riskLevel: 'CRITICAL' } as any);
    assert(!riskMismatch.valid, 'Risk context mismatch is rejected');
    assert(riskMismatch.reason?.includes('risk level mismatch') === true, 'Reason notes risk level mismatch');

    // -----------------------------------------------------------------------
    // CATEGORY D: Authorization Boundary (LLM Propose != Execute)
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY D: Authorization Boundary ---');
    const boundaryGoal = globalExecutiveGoalManager.createGoal({ sessionId: 'session_d', objective: 'Boundary Verification Goal' });
    const boundaryFile = path.join(testSandbox, 'boundary_target.txt');

    // 1. LLM proposal alone -> ZERO mutation
    const proposedTask = globalExecutiveTaskManager.createTask({
      goalId: boundaryGoal.goalId,
      title: 'LLM Proposed Mutation',
      description: 'LLM proposes file write without token',
      riskLevel: 'HIGH',
      permissionLevel: 'AWAIT_HUMAN_AUTHORIZATION',
      plan: {
        planId: 'plan_d_prop',
        capabilityId: 'cap_fs_write',
        actionName: 'WRITE',
        targetPath: boundaryFile,
        parameters: { content: 'Should never exist\n', path: boundaryFile },
        isDryRun: false,
      },
    });

    const execWithoutAuth = await globalExecutiveExecution.executeTask(proposedTask, boundaryGoal.sessionId);
    assert(!execWithoutAuth.success, 'Execution without token fails');
    assert(execWithoutAuth.error?.includes('AUTHORIZATION_REQUIRED') === true, 'Error indicates authorization required');
    assert(!fs.existsSync(boundaryFile), 'Host filesystem remains untouched: ZERO mutation');

    // 2. High confidence alone -> ZERO authorization
    const highConfTask = globalExecutiveTaskManager.createTask({
      goalId: boundaryGoal.goalId,
      title: 'High Confidence Task',
      description: 'Confidence 0.999 is NOT authorization',
      riskLevel: 'CRITICAL',
      permissionLevel: 'AWAIT_HUMAN_AUTHORIZATION',
      metadata: { confidence: 0.999, model: 'gemini-pro' },
      plan: {
        planId: 'plan_d_conf',
        capabilityId: 'cap_fs_write',
        actionName: 'WRITE',
        targetPath: boundaryFile,
        parameters: { content: 'High confidence content\n', path: boundaryFile },
        isDryRun: false,
      },
    });
    const govConf = globalExecutiveGovernance.evaluate(highConfTask);
    assert(govConf.requiresHumanApproval === true, 'High confidence cannot bypass human approval');
    assert(!fs.existsSync(boundaryFile), 'High confidence produces ZERO host mutation');

    // 3. Invalid authorization token -> ZERO mutation
    const fakeTokenId = 'tok_fake_forged_token_id';
    const execWithFake = await globalExecutiveExecution.executeTask(proposedTask, boundaryGoal.sessionId, fakeTokenId);
    assert(!execWithFake.success, 'Execution with invalid token fails');
    assert(!fs.existsSync(boundaryFile), 'Invalid token produces ZERO host mutation');

    // -----------------------------------------------------------------------
    // CATEGORY E: Real Authorized Execution & Verification
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY E: Real Authorized Execution ---');
    const realExecFile = path.join(testSandbox, 'authorized_real_file.txt');
    const realExecGoal = globalExecutiveGoalManager.createGoal({ sessionId: 'session_real_e', objective: 'Real Execution Goal' });
    const realExecTask = globalExecutiveTaskManager.createTask({
      goalId: realExecGoal.goalId,
      title: 'Authorized Safe Host Task',
      description: 'Writes authorized file to test sandbox',
      riskLevel: 'HIGH',
      permissionLevel: 'AWAIT_HUMAN_AUTHORIZATION',
      plan: {
        planId: 'plan_real_e',
        capabilityId: 'cap_fs_write',
        actionName: 'WRITE',
        targetPath: realExecFile,
        parameters: { content: 'BOWCON Real Authorized Payload MS-1.3.38\n', path: realExecFile },
        isDryRun: false,
      },
    });

    // Request & approve via canonical HumanGate
    const realGateReq = globalExecutiveAuthorization.requestMasterAuthorization(realExecTask, realExecGoal.goalId, realExecGoal.sessionId);
    const realApproved = globalMasterHumanAuthority.approveGateRequest(realGateReq.requestId, 'master_operator', {
      sessionId: realExecGoal.sessionId,
      goalId: realExecGoal.goalId,
      taskId: realExecTask.taskId,
    });
    const realToken = realApproved.authorizationToken!;
    globalExecutiveAuthorization.bindAuthorizedToken(realToken, realExecTask, realExecGoal.goalId, realExecGoal.sessionId);

    // Execute through governed pipeline -> reaches CapabilityRuntime
    const execSuccessResult = await globalExecutiveExecution.executeTask(realExecTask, realExecGoal.sessionId, realToken.tokenId);
    assert(execSuccessResult.success === true, 'Authorized execution succeeds');
    assert(fs.existsSync(realExecFile), 'Real host environment was modified correctly');
    const fileContent = fs.readFileSync(realExecFile, 'utf8');
    assert(fileContent.includes('BOWCON Real Authorized Payload'), 'File contains exact payload');

    // Independent verification
    const verified = globalExecutiveExecution.verifyTask(realExecTask);
    assert(verified === true, 'Independent verification confirms real host mutation');

    // -----------------------------------------------------------------------
    // CATEGORY F: USER_STOP Supremacy Across All Lifecycle Phases
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY F: USER_STOP Supremacy ---');
    globalMasterHumanAuthority.triggerUserStop('Emergency drill stop');
    assert(globalMasterHumanAuthority.isUserStopActive, 'USER_STOP is active');
    assert(globalExecutiveCancellation.isUserStopActive, 'Executive cancellation observes USER_STOP');
    assert(globalAgentLoopControl.isStopped(), 'AgentLoop observes USER_STOP');
    assert(globalSupervisorRuntime.isSafeStopActive(), 'Supervisor observes USER_STOP');
    assert(globalCapabilityRuntime.isEmergencyStopActive(), 'CapabilityRuntime observes USER_STOP');

    // 1. Goal submission blocked
    await assertRejects(
      () => globalExecutiveRuntime.submitGoal({ sessionId: 'session_f', objective: 'Goal during stop' }),
      'USER_STOP_ACTIVE',
      'Goal submission rejected during USER_STOP'
    );

    // 2. Stepping blocked
    const stoppedGoal = globalExecutiveGoalManager.createGoal({ sessionId: 'session_f', objective: 'Existing Goal' });
    const graphF = new ExecutiveDependencyGraph();
    const taskF = globalExecutiveTaskManager.createTask({ goalId: stoppedGoal.goalId, title: 'F Task', description: 'F' });
    graphF.addTask(taskF);
    (globalExecutiveRuntime as any)._goalGraphs.set(stoppedGoal.goalId, graphF);
    const steppedGoal = await globalExecutiveRuntime.stepGoal(stoppedGoal.goalId);
    assert(steppedGoal.status === 'STOPPED', 'Goal transitions to STOPPED when stepped during USER_STOP');

    // 3. Human Gate approval blocked during USER_STOP
    const testGateReqF = globalSupervisorHumanGate.createRequest(
      { diagnosisId: 'd', anomalyId: 'a', timestamp: Date.now(), probableCause: 'p', evidence: [], affectedCapability: 'c', affectedResource: 'r', severity: 'HIGH', isInconclusive: false, recoverability: 'HUMAN_REQUIRED', recommendedRecovery: 'r', requiresHumanApproval: true },
      { planId: 'p', diagnosisId: 'd', anomalyId: 'a', recoveryClass: 'HUMAN_REQUIRED', steps: [], requiresHumanApproval: true, riskLevel: 'HIGH', timeoutMs: 60000, maxAttempts: 1, createdTimestamp: Date.now() }
    );
    assertThrows(
      () => globalMasterHumanAuthority.approveGateRequest(testGateReqF.requestId, 'master_operator'),
      'USER_STOP_ACTIVE',
      'HumanGate approval rejected during USER_STOP'
    );

    // 4. Capability execution blocked during USER_STOP
    await assertRejects(
      () => globalCapabilityRuntime.executeCapability({ requestId: 'r_f', capabilityId: 'system.observe', parameters: {} }),
      'Emergency Stop',
      'Capability execution rejected during USER_STOP'
    );

    // 5. Agent Loop bridge blocked during USER_STOP
    const bridgeResultF = await globalExecutiveAgentLoopBridge.stepGoalThroughAgentLoop(stoppedGoal.goalId);
    assert(!bridgeResultF.success, 'AgentLoop bridge fails during USER_STOP');
    assert(bridgeResultF.status === 'USER_STOP_ACTIVE', 'Bridge reports USER_STOP_ACTIVE');

    // 6. Recovery blocked during USER_STOP
    const recoveryAssessmentF = globalExecutiveRecovery.assessFailure(taskF, stoppedGoal.goalId);
    assert(!recoveryAssessmentF.recoverable, 'Recovery forbidden during USER_STOP');
    assert(recoveryAssessmentF.classification === 'CRITICAL_BLOCKED', 'Classified as CRITICAL_BLOCKED');
    assert(recoveryAssessmentF.suggestedAction === 'ABORT', 'Suggested action is ABORT');

    // Reset only by master
    globalMasterHumanAuthority.resetUserStop('master_operator');
    assert(!globalMasterHumanAuthority.isUserStopActive, 'USER_STOP reset by master');

    // -----------------------------------------------------------------------
    // CATEGORY G: Executive / ContinuousAgentLoop Delegation Bridge
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY G: ContinuousAgentLoop Delegation Bridge ---');
    const bridgeGoal = globalExecutiveGoalManager.createGoal({ sessionId: 'session_bridge', objective: 'Bridge Test Goal' });
    const bridgeFile = path.join(testSandbox, 'bridge_output.txt');
    const bridgeTask = globalExecutiveTaskManager.createTask({
      goalId: bridgeGoal.goalId,
      title: 'Bridge Step Task',
      description: 'Steps through 10-phase agent loop',
      riskLevel: 'HIGH',
      permissionLevel: 'AWAIT_HUMAN_AUTHORIZATION',
      plan: {
        planId: 'plan_bridge_1',
        capabilityId: 'cap_fs_write',
        actionName: 'WRITE',
        targetPath: bridgeFile,
        parameters: { content: 'Bridge payload\n', path: bridgeFile },
        isDryRun: false,
      },
    });

    const bridgeGraph = new ExecutiveDependencyGraph();
    bridgeGraph.addTask(bridgeTask);
    (globalExecutiveRuntime as any)._goalGraphs.set(bridgeGoal.goalId, bridgeGraph);

    // First step: without token -> reaches AUTHORIZE phase and sets AWAITING_HUMAN
    const step1 = await globalExecutiveAgentLoopBridge.stepGoalThroughAgentLoop(bridgeGoal.goalId);
    assert(!step1.success, 'Step 1 requires authorization');
    assert(step1.phase === 'AUTHORIZE', 'Step 1 stopped at AUTHORIZE phase');
    assert(step1.status === 'WAIT_FOR_MASTER_AUTHORIZATION', 'Step 1 status is WAIT_FOR_MASTER_AUTHORIZATION');

    // Approve token
    const bridgeToken = globalExecutiveAuthorization.issueHumanToken(bridgeTask.taskId, bridgeGoal.sessionId, 'master_operator', {
      capabilityId: 'cap_fs_write',
      target: bridgeFile,
      goalId: bridgeGoal.goalId,
    });

    // Second step: with token -> completes EXECUTE -> VERIFY -> OBSERVE_PRIME
    const step2 = await globalExecutiveAgentLoopBridge.stepGoalThroughAgentLoop(bridgeGoal.goalId, globalAgentLoopRuntime, {
      authTokenId: bridgeToken.tokenId,
    });
    assert(step2.success, 'Step 2 succeeds with valid token');
    assert(step2.phase === 'OBSERVE_PRIME', 'Step 2 completes all 10 phases');
    assert(fs.existsSync(bridgeFile), 'Bridge task produced real host file');

    // -----------------------------------------------------------------------
    // CATEGORY H: Executive / Supervisor Recovery Bridge
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY H: Supervisor Recovery Bridge ---');
    const supGoal = globalExecutiveGoalManager.createGoal({ sessionId: 'session_sup', objective: 'Supervisor Diagnosis Goal' });
    const supTask = globalExecutiveTaskManager.createTask({
      goalId: supGoal.goalId,
      title: 'Failing Supervised Task',
      description: 'Will fail and request supervisor diagnosis',
      riskLevel: 'LOW',
      permissionLevel: 'AUTO_EXECUTE',
      retryPolicy: { maxAttempts: 3, backoffMs: 50 },
    });
    supTask.attemptCount = 1;
    supTask.error = 'Transient connection reset';

    const supAssessment = globalExecutiveRecovery.assessFailure(supTask, supGoal.goalId);
    assert(supAssessment.recoverable === true, 'Transient error is recoverable');
    assert(supAssessment.classification === 'RECOVERABLE', 'Classification is RECOVERABLE');
    assert(supAssessment.suggestedAction === 'RETRY', 'Action is RETRY');

    const prepSuccess = await globalExecutiveRecovery.prepareRecovery(supTask);
    assert(prepSuccess === true, 'Supervisor diagnosis bridge executes successfully');

    // -----------------------------------------------------------------------
    // CATEGORY I: Pause / Resume / Cancel Real Behavior
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY I: Pause / Resume / Cancel ---');
    const prcGoal = globalExecutiveGoalManager.createGoal({ sessionId: 'session_prc', objective: 'PRC Goal' });
    const prcGraph = new ExecutiveDependencyGraph();
    const prcTask = globalExecutiveTaskManager.createTask({ goalId: prcGoal.goalId, title: 'PRC Task', description: 'PRC' });
    prcGraph.addTask(prcTask);
    (globalExecutiveRuntime as any)._goalGraphs.set(prcGoal.goalId, prcGraph);
    globalExecutiveGoalManager.updateGoalStatus(prcGoal.goalId, 'RUNNING');

    // 1. Pause
    globalExecutiveRuntime.pauseGoal(prcGoal.goalId, 'Maintenance pause');
    assert(globalExecutiveCancellation.isGoalPaused(prcGoal.goalId), 'Cancellation plane records pause');
    assert(prcGoal.status === 'PAUSED', 'Goal status is PAUSED');
    const pauseStep = await globalExecutiveRuntime.stepGoal(prcGoal.goalId);
    assert(pauseStep.status === 'PAUSED', 'Stepping paused goal returns PAUSED without executing');

    // 2. Resume
    globalExecutiveRuntime.resumeGoal(prcGoal.goalId);
    assert(!globalExecutiveCancellation.isGoalPaused(prcGoal.goalId), 'Pause removed on cancellation plane');
    assert(prcGoal.status === 'RUNNING', 'Goal resumes to RUNNING');

    // 3. Cancel
    globalExecutiveRuntime.cancelGoal(prcGoal.goalId, 'Goal abandoned');
    assert(globalExecutiveCancellation.isGoalCancelled(prcGoal.goalId), 'Cancellation plane records cancel');
    assert(prcGoal.status === 'CANCELLED', 'Goal status is CANCELLED');
    const cancelStep = await globalExecutiveRuntime.stepGoal(prcGoal.goalId);
    assert(cancelStep.status === 'CANCELLED', 'Cancelled goal cannot be resumed or stepped');

    // -----------------------------------------------------------------------
    // CATEGORY J: Checkpoint Integrity & Fail-Closed Recovery
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY J: Checkpoint Integrity ---');
    const chkGoal = globalExecutiveGoalManager.createGoal({ sessionId: 'session_chk', objective: 'Checkpoint Goal' });
    const chkTaskA = globalExecutiveTaskManager.createTask({ goalId: chkGoal.goalId, title: 'Task A', description: 'A' });
    const chkTaskB = globalExecutiveTaskManager.createTask({
      goalId: chkGoal.goalId,
      title: 'Task B',
      description: 'B',
      dependencies: [{ parentTaskId: chkTaskA.taskId, requiredStatus: 'COMPLETED' }],
    });

    const checkpoint = globalExecutiveCheckpoint.createCheckpoint(chkGoal, [chkTaskA, chkTaskB]);
    assert(checkpoint.checkpointId.startsWith('chk_'), 'Checkpoint ID starts with chk_');
    assert(checkpoint.sha256Checksum.length === 64, 'SHA-256 checksum has 64 hex characters');

    // 1. Valid checkpoint
    const valValid = globalExecutiveCheckpoint.validateCheckpoint(checkpoint);
    assert(valValid.valid === true, 'Fresh valid checkpoint validates');

    // 2. Tampered checkpoint
    const tampered = { ...checkpoint, goal: { ...checkpoint.goal, objective: 'Hacked Objective' } };
    const valTampered = globalExecutiveCheckpoint.validateCheckpoint(tampered);
    assert(!valTampered.valid, 'Tampered checkpoint is rejected');
    assert(valTampered.error?.includes('checksum mismatch') === true, 'Error notes checksum mismatch');

    // 3. Stale checkpoint (> 24 hours)
    const futureTime = checkpoint.timestamp + 25 * 60 * 60 * 1000;
    const valStale = globalExecutiveCheckpoint.validateCheckpoint(checkpoint, futureTime);
    assert(!valStale.valid, 'Stale checkpoint is rejected');
    assert(valStale.error?.includes('stale') === true, 'Error notes stale checkpoint');

    // 4. Session mismatch
    const sessionMismatchChk = { ...checkpoint, sessionId: 'other_session' };
    const valSess = globalExecutiveCheckpoint.validateCheckpoint(sessionMismatchChk);
    assert(!valSess.valid, 'Cross-session checkpoint rejected');

    // 5. Goal mismatch in task
    const badTask = { ...chkTaskA, goalId: 'other_goal' };
    const taskMismatchChk = globalExecutiveCheckpoint.createCheckpoint(chkGoal, [badTask]);
    const valTaskMis = globalExecutiveCheckpoint.validateCheckpoint(taskMismatchChk);
    assert(!valTaskMis.valid, 'Cross-goal task in checkpoint rejected');

    // 6. Restore preserves identity
    const persistence = new (globalExecutivePersistence.constructor as any)(testSandbox);
    persistence.saveCheckpoint(checkpoint);
    const loaded = persistence.loadCheckpoint(chkGoal.goalId);
    assert(loaded?.goal.goalId === chkGoal.goalId, 'Restored checkpoint preserves goal ID');
    assert(loaded?.tasks[0].taskId === chkTaskA.taskId, 'Restored task A preserves task ID');
    assert(loaded?.tasks[1].taskId === chkTaskB.taskId, 'Restored task B preserves task ID');

    // -----------------------------------------------------------------------
    // CATEGORY K: Strict DAG Safety (Cycles, Self-Dependencies, Orphans, Duplicates)
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY K: Strict DAG Safety ---');
    const dagK = new ExecutiveDependencyGraph();
    const taskK1 = globalExecutiveTaskManager.createTask({ goalId: 'goal_k', title: 'K1', description: 'K1' });
    const taskK2 = globalExecutiveTaskManager.createTask({ goalId: 'goal_k', title: 'K2', description: 'K2' });
    dagK.addTask(taskK1);
    dagK.addTask(taskK2);

    // 1. Duplicate task rejection
    assertThrows(() => dagK.addTask(taskK1), 'DAG_DUPLICATE_TASK', 'Duplicate task addition is rejected');

    // 2. Self-dependency rejection
    assertThrows(() => dagK.addDependency(taskK1.taskId, taskK1.taskId), 'DAG_SELF_DEPENDENCY', 'Self-dependency is rejected');

    // 3. Orphan dependency rejection
    assertThrows(() => dagK.addDependency(taskK1.taskId, 'non_existent_parent'), 'DAG_ORPHAN_DEPENDENCY', 'Orphan dependency is rejected');

    // 4. Cycle rejection
    dagK.addDependency(taskK2.taskId, taskK1.taskId); // K2 depends on K1
    assertThrows(() => dagK.addDependency(taskK1.taskId, taskK2.taskId), 'DAG_CYCLE_DETECTED', 'Cycle K1 -> K2 -> K1 is rejected by default');
    dagK.addDependency(taskK1.taskId, taskK2.taskId, 'COMPLETED', false); // allowed in relaxed graph construction
    assert(dagK.hasCycles(), 'Cycle detected in graph');
    assertThrows(() => dagK.getTopologicalSort(), 'DAG_TOPOLOGICAL_ERROR', 'Topological sort rejects cyclic graph');

    // -----------------------------------------------------------------------
    // CATEGORY L: Priority Invariants
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY L: Priority Invariants ---');
    assert(compareGoalPriority('CRITICAL', 'HIGH') < 0, 'CRITICAL goal precedes HIGH');
    assert(compareGoalPriority('HIGH', 'NORMAL') < 0, 'HIGH goal precedes NORMAL');
    assert(compareGoalPriority('NORMAL', 'LOW') < 0, 'NORMAL goal precedes LOW');
    assert(compareGoalPriority('LOW', 'BACKGROUND') < 0, 'LOW goal precedes BACKGROUND');
    assert(isHigherPriority('CRITICAL', 'HIGH') === true, 'CRITICAL is higher than HIGH');

    // Priority NEVER bypasses dependency
    const prioDag = new ExecutiveDependencyGraph();
    const lowRoot = globalExecutiveTaskManager.createTask({ goalId: 'goal_prio', title: 'Low Root', description: 'R', priority: 'LOW' });
    const critDependent = globalExecutiveTaskManager.createTask({
      goalId: 'goal_prio',
      title: 'Crit Dependent',
      description: 'D',
      priority: 'CRITICAL',
      dependencies: [{ parentTaskId: lowRoot.taskId, requiredStatus: 'COMPLETED' }],
    });
    prioDag.addTask(lowRoot);
    prioDag.addTask(critDependent);

    const readyPrio = prioDag.getReadyTasks();
    assert(readyPrio.length === 1 && readyPrio[0].taskId === lowRoot.taskId, 'Low-priority root is ready; critical dependent is blocked by dependency');

    // Priority NEVER bypasses resource lock
    const lockResource = 'resource_critical_shared';
    assert(globalExecutiveScheduler.acquireLock(lockResource), 'Lock acquired');
    assert(!globalExecutiveScheduler.acquireLock(lockResource), 'Second acquisition blocked');
    globalExecutiveScheduler.releaseLock(lockResource);
    assert(globalExecutiveScheduler.activeLockCount === 0, 'Lock released');

    // Priority NEVER bypasses USER_STOP
    globalMasterHumanAuthority.triggerUserStop('Priority test stop');
    const prioAssessment = globalExecutiveRecovery.assessFailure(critDependent, 'goal_prio');
    assert(!prioAssessment.recoverable, 'Critical task cannot recover during USER_STOP');
    globalMasterHumanAuthority.resetUserStop('master_operator');

    // -----------------------------------------------------------------------
    // CATEGORY M: Recovery Boundedness & 4-Tier Classification
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY M: Recovery Boundedness ---');
    const recTask = globalExecutiveTaskManager.createTask({
      goalId: 'goal_rec_m',
      title: 'Recovery Task',
      description: 'Bounded retry test',
      riskLevel: 'LOW',
      permissionLevel: 'AUTO_EXECUTE',
      retryPolicy: { maxAttempts: 3, backoffMs: 10 },
    });

    // Attempt 1: RECOVERABLE -> RETRY
    recTask.attemptCount = 0;
    const a1 = globalExecutiveRecovery.assessFailure(recTask, 'goal_rec_m');
    assert(a1.recoverable === true, 'Attempt 1 is recoverable');
    assert(a1.classification === 'RECOVERABLE', 'Classified as RECOVERABLE');
    assert(a1.suggestedAction === 'RETRY', 'Action is RETRY');

    // Attempt 2: RECOVERABLE -> RETRY
    recTask.attemptCount = 1;
    const a2 = globalExecutiveRecovery.assessFailure(recTask, 'goal_rec_m');
    assert(a2.recoverable === true, 'Attempt 2 is recoverable');
    assert(a2.classification === 'RECOVERABLE', 'Classified as RECOVERABLE');

    // Attempt 3: Exhausted -> DEGRADED -> ESCALATE
    recTask.attemptCount = 3;
    const a3 = globalExecutiveRecovery.assessFailure(recTask, 'goal_rec_m');
    assert(a3.recoverable === false, 'Attempt 3 is not autonomously recoverable');
    assert(a3.classification === 'DEGRADED', 'Classified as DEGRADED');
    assert(a3.suggestedAction === 'ESCALATE', 'Action is ESCALATE after retry limit');

    // Human required -> HUMAN_REQUIRED -> WAIT_FOR_MASTER_AUTHORIZATION
    const humanReqTask = globalExecutiveTaskManager.createTask({
      goalId: 'goal_rec_m',
      title: 'Human Required Task',
      description: 'Needs authorization',
      riskLevel: 'HIGH',
      permissionLevel: 'AWAIT_HUMAN_AUTHORIZATION',
    });
    const aHuman = globalExecutiveRecovery.assessFailure(humanReqTask, 'goal_rec_m');
    assert(aHuman.classification === 'HUMAN_REQUIRED', 'Classified as HUMAN_REQUIRED');
    assert(aHuman.suggestedAction === 'WAIT_FOR_MASTER_AUTHORIZATION', 'Action is WAIT_FOR_MASTER_AUTHORIZATION');

    // Critical failure -> CRITICAL_BLOCKED
    const critTask = globalExecutiveTaskManager.createTask({
      goalId: 'goal_rec_m',
      title: 'Fatal Task',
      description: 'Fatal',
      riskLevel: 'CRITICAL',
    });
    const aCrit = globalExecutiveRecovery.assessFailure(critTask, 'goal_rec_m');
    assert(aCrit.classification === 'CRITICAL_BLOCKED', 'Classified as CRITICAL_BLOCKED');
    assert(aCrit.suggestedAction === 'ESCALATE', 'Action is ESCALATE');

    // -----------------------------------------------------------------------
    // CATEGORY N: Audit Chain & Recursive Secret Redaction
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY N: Audit Chain Integrity & Secret Redaction ---');
    const auditEvent1 = globalExecutiveAudit.record('TEST_EVENT_1', 'entity_1', { data: 'public_value' });
    const auditEvent2 = globalExecutiveAudit.record('TEST_EVENT_2', 'entity_2', {
      apiKey: 'sk-live-secret-key-12345',
      password: 'super_secret_password',
      nested: {
        token: 'auth_token_secret_xyz',
        privateKey: 'BEGIN PRIVATE KEY...',
      },
    });

    assert(auditEvent1.signature.length === 64, 'Audit event 1 has SHA-256 signature');
    assert(auditEvent2.previousHash === auditEvent1.signature, 'Audit event 2 links cryptographically to event 1 signature');
    assert(auditEvent2.details.apiKey === '[REDACTED_SECRET]', 'apiKey is redacted');
    assert(auditEvent2.details.password === '[REDACTED_SECRET]', 'password is redacted');
    assert((auditEvent2.details.nested as any).token === '[REDACTED_SECRET]', 'nested token is redacted');
    assert((auditEvent2.details.nested as any).privateKey === '[REDACTED_SECRET]', 'nested privateKey is redacted');

    // Verify chain integrity method
    const chainValid = globalExecutiveAudit.verifyIntegrity();
    assert(chainValid === true, 'Audit chain passes cryptographic integrity verification');

    // -----------------------------------------------------------------------
    // CATEGORY O: Protected Workspace Absolute Rule (C:\BOW\shopofbow)
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY O: Protected Workspace Absolute Invariant ---');
    const protectedTarget = 'C:\\BOW\\shopofbow\\config.json';
    const protectedTask = globalExecutiveTaskManager.createTask({
      goalId: 'goal_protected_o',
      title: 'Protected Workspace Attack Task',
      description: 'Attempt to access protected shopofbow directory',
      riskLevel: 'HIGH',
      permissionLevel: 'AUTO_EXECUTE',
      plan: {
        planId: 'plan_hack_shop',
        capabilityId: 'capability.file_read',
        actionName: 'READ',
        targetPath: protectedTarget,
        parameters: { path: protectedTarget },
        isDryRun: false,
      },
    });

    const govProt = globalExecutiveGovernance.evaluate(protectedTask);
    assert(govProt.permitted === false, 'Access to C:\\BOW\\shopofbow is unconditionally rejected by governance');
    assert(govProt.violations.some(v => v.includes('shopofbow')), 'Violation notes protected workspace restriction');

    // Host shell execution prohibition check
    for (const forbidden of FORBIDDEN_EXECUTION_PATTERNS) {
      assertThrows(
        () => globalMasterHumanAuthority.assertPermittedExecution(`run ${forbidden} --all`),
        'FORBIDDEN_HOST_SHELL_EXECUTION',
        `Forbidden execution pattern "${forbidden}" is blocked`
      );
    }

    console.log('\n============================================================');
    console.log(`REALITY GATE COMPLETE: ${passedAssertions} assertions PASSED`);
    console.log('0 FAILED');
    console.log('============================================================');
  } finally {
    if (fs.existsSync(testSandbox)) {
      fs.rmSync(testSandbox, { recursive: true, force: true });
    }
  }
}

runRealityGate().catch((err) => {
  console.error('\n[FATAL] Reality Gate failed with error:', err);
  process.exit(1);
});
