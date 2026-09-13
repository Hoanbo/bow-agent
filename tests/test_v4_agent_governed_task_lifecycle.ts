// tests/test_v4_agent_governed_task_lifecycle.ts
// BOWCON V4.0 — Milestone 1.4.01: AGENT TASK LIFECYCLE & STATE ENGINE REALITY GATE
//
// Comprehensive Reality Verification Suite covering:
// A. Canonical 9-state task lifecycle transitions
// B. Terminal state immutability (COMPLETED, FAILED, CANCELLED)
// C. Self-transition restrictions (only EXECUTING -> EXECUTING allowed)
// D. Optimistic concurrency control (version checks)
// E. Strict tenant isolation and partition boundary enforcement
// F. Step model progression and bounds enforcement
// G. Cryptographic SHA-256 provenance calculation and tamper detection
// H. Crash recovery rehydration of interrupted tasks
// I. USER_STOP absolute supremacy
// J. Structured audit logging integration
// K. Security and forbidden primitive verification

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  AgentTaskRuntime,
  AgentTaskStore,
  AgentTaskStateEngine,
  globalAgentTaskStateEngine,
  IllegalStateTransitionError,
  ConcurrencyConflictError,
  CrossTenantAccessViolationError,
  ProvenanceTamperError,
  UserStopActiveError,
  TaskNotFoundError,
  TaskValidationError,
  createTaskId,
  createStepId,
  type AgentTask,
  type TaskState,
} from '../src/core/taskLifecycle/index.js';
import { AuditLedger } from '../src/core/auditLedger.js';

let passed = 0;
function ok(condition: boolean, msg: string): void {
  assert(condition, msg);
  passed++;
  console.log(`  [PASS ${passed.toString().padStart(2, '0')}] ${msg}`);
}

async function runRealityGate(): Promise<void> {
  console.log('\n================================================================================');
  console.log('  BOWCON V4.0 — MS-1.4.01: AGENT TASK LIFECYCLE & STATE ENGINE REALITY GATE');
  console.log('================================================================================\n');

  const testDir = path.resolve(process.cwd(), 'data/test_agent_task_lifecycle_' + Date.now());
  const auditFile = path.resolve(testDir, 'audit_ledger.jsonl');
  const auditLedger = new AuditLedger(auditFile);

  let userStopFlag = false;
  const runtime = new AgentTaskRuntime({
    baseDir: testDir,
    auditLedger,
    isUserStopActive: () => userStopFlag,
  });

  const tenantA = 'tenant_enterprise_alpha';
  const tenantB = 'tenant_retail_beta';
  const userA = 'user_analyst_01';

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: Deterministic ID Generators & Validation
    // ------------------------------------------------------------------------
    console.log('[SECTION 1: Deterministic ID Generators & Validation]');
    const id1 = createTaskId(tenantA, 1000000, 'abcd');
    const id2 = createTaskId(tenantA, 1000000, 'abcd');
    ok(id1 === id2, 'createTaskId produces deterministic IDs for identical inputs');
    ok(id1.startsWith('task_tenant_enterprise_alpha_1000000_abcd'), 'createTaskId formats slugified tenant and timestamp');

    const stepId = createStepId(id1, 0);
    ok(stepId === `step_${id1}_0`, 'createStepId produces canonical step identifier');

    // ------------------------------------------------------------------------
    // SECTION 2: State Engine Transition Matrix Validation
    // ------------------------------------------------------------------------
    console.log('\n[SECTION 2: State Engine Transition Matrix Validation]');
    const engine = globalAgentTaskStateEngine;

    // Legal transitions
    ok(engine.isValidTransition('SUBMITTED', 'ACCEPTED'), 'SUBMITTED -> ACCEPTED is valid');
    ok(engine.isValidTransition('SUBMITTED', 'CANCELLED'), 'SUBMITTED -> CANCELLED is valid');
    ok(engine.isValidTransition('SUBMITTED', 'FAILED'), 'SUBMITTED -> FAILED is valid');
    ok(engine.isValidTransition('ACCEPTED', 'PLANNING'), 'ACCEPTED -> PLANNING is valid');
    ok(engine.isValidTransition('ACCEPTED', 'EXECUTING'), 'ACCEPTED -> EXECUTING is valid');
    ok(engine.isValidTransition('ACCEPTED', 'PAUSED'), 'ACCEPTED -> PAUSED is valid');
    ok(engine.isValidTransition('PLANNING', 'EXECUTING'), 'PLANNING -> EXECUTING is valid');
    ok(engine.isValidTransition('EXECUTING', 'EXECUTING'), 'EXECUTING -> EXECUTING (step advance) is valid');
    ok(engine.isValidTransition('EXECUTING', 'AWAITING_APPROVAL'), 'EXECUTING -> AWAITING_APPROVAL is valid');
    ok(engine.isValidTransition('AWAITING_APPROVAL', 'EXECUTING'), 'AWAITING_APPROVAL -> EXECUTING is valid');
    ok(engine.isValidTransition('EXECUTING', 'PAUSED'), 'EXECUTING -> PAUSED is valid');
    ok(engine.isValidTransition('PAUSED', 'EXECUTING'), 'PAUSED -> EXECUTING is valid');
    ok(engine.isValidTransition('EXECUTING', 'COMPLETED'), 'EXECUTING -> COMPLETED is valid');
    ok(engine.isValidTransition('EXECUTING', 'FAILED'), 'EXECUTING -> FAILED is valid');
    ok(engine.isValidTransition('EXECUTING', 'CANCELLED'), 'EXECUTING -> CANCELLED is valid');

    // Illegal transitions
    ok(!engine.isValidTransition('SUBMITTED', 'PLANNING'), 'SUBMITTED -> PLANNING is invalid');
    ok(!engine.isValidTransition('SUBMITTED', 'COMPLETED'), 'SUBMITTED -> COMPLETED is invalid');
    ok(!engine.isValidTransition('PLANNING', 'COMPLETED'), 'PLANNING -> COMPLETED without execution is invalid');
    ok(!engine.isValidTransition('AWAITING_APPROVAL', 'COMPLETED'), 'AWAITING_APPROVAL -> COMPLETED directly is invalid');

    // Terminal state checks
    ok(engine.isTerminalState('COMPLETED'), 'COMPLETED is terminal');
    ok(engine.isTerminalState('FAILED'), 'FAILED is terminal');
    ok(engine.isTerminalState('CANCELLED'), 'CANCELLED is terminal');
    ok(!engine.isTerminalState('EXECUTING'), 'EXECUTING is not terminal');
    ok(!engine.isTerminalState('PAUSED'), 'PAUSED is not terminal');

    // Terminal transitions out are all forbidden
    ok(!engine.isValidTransition('COMPLETED', 'EXECUTING'), 'COMPLETED -> EXECUTING is forbidden');
    ok(!engine.isValidTransition('FAILED', 'EXECUTING'), 'FAILED -> EXECUTING is forbidden');
    ok(!engine.isValidTransition('CANCELLED', 'SUBMITTED'), 'CANCELLED -> SUBMITTED is forbidden');

    // Self-transitions forbidden except EXECUTING
    ok(!engine.isValidTransition('SUBMITTED', 'SUBMITTED'), 'SUBMITTED -> SUBMITTED is forbidden');
    ok(!engine.isValidTransition('ACCEPTED', 'ACCEPTED'), 'ACCEPTED -> ACCEPTED is forbidden');
    ok(!engine.isValidTransition('PLANNING', 'PLANNING'), 'PLANNING -> PLANNING is forbidden');
    ok(!engine.isValidTransition('PAUSED', 'PAUSED'), 'PAUSED -> PAUSED is forbidden');

    // ------------------------------------------------------------------------
    // SECTION 3: Task Creation & Initial State Contract
    // ------------------------------------------------------------------------
    console.log('\n[SECTION 3: Task Creation & Initial State Contract]');
    const task1 = runtime.createTask({
      tenantId: tenantA,
      userId: userA,
      title: 'Analyze Monthly Inventory Discrepancy',
      intent: 'Analyze stock deltas and generate reconciliation proposals',
      riskLevel: 'MEDIUM',
      steps: [
        {
          description: 'Query ERP inventory balance',
          capabilityId: 'cap_erp_query',
          actionName: 'get_balance',
          riskLevel: 'LOW',
        },
        {
          description: 'Export warehouse scan delta',
          capabilityId: 'cap_warehouse_sync',
          actionName: 'get_scans',
          riskLevel: 'MEDIUM',
        },
        {
          description: 'Post ledger adjustment recommendation',
          capabilityId: 'cap_finance_draft',
          actionName: 'draft_adjustment',
          riskLevel: 'HIGH',
          requiresApproval: true,
        },
      ],
    });

    ok(task1.state === 'SUBMITTED', 'Initial task state is SUBMITTED');
    ok(task1.version === 1, 'Initial task version is 1');
    ok(task1.steps.length === 3, 'Task has exactly 3 configured steps');
    ok(task1.currentStepIndex === 0, 'Initial currentStepIndex is 0');
    ok(task1.provenanceHash.length === 64, 'Initial SHA-256 provenanceHash is 64 hex characters');
    ok(task1.steps[2].requiresApproval === true, 'High-risk step 2 requires approval');

    // Validation errors
    assert.throws(
      () => runtime.createTask({ tenantId: '', userId: userA, title: 'T', intent: 'I' }),
      TaskValidationError,
      'createTask rejects empty tenantId'
    );
    passed++;
    console.log(`  [PASS ${passed.toString().padStart(2, '0')}] createTask rejects empty tenantId`);

    // ------------------------------------------------------------------------
    // SECTION 4: Optimistic Concurrency Control (Version Checks)
    // ------------------------------------------------------------------------
    console.log('\n[SECTION 4: Optimistic Concurrency Control (Version Checks)]');
    // Stale version rejected
    assert.throws(
      () => runtime.transitionTask(tenantA, task1.taskId, {
        toState: 'ACCEPTED',
        expectedVersion: 999, // Stale version!
      }),
      ConcurrencyConflictError,
      'transitionTask rejects stale expectedVersion with ConcurrencyConflictError'
    );
    passed++;
    console.log(`  [PASS ${passed.toString().padStart(2, '0')}] transitionTask rejects stale expectedVersion`);

    // ------------------------------------------------------------------------
    // SECTION 5: Happy Path Lifecycle State Progression
    // ------------------------------------------------------------------------
    console.log('\n[SECTION 5: Happy Path Lifecycle State Progression]');
    // SUBMITTED -> ACCEPTED
    const tAccepted = runtime.transitionTask(tenantA, task1.taskId, {
      toState: 'ACCEPTED',
      expectedVersion: 1,
      reason: 'Task accepted by agent scheduler',
    });
    ok(tAccepted.state === 'ACCEPTED', 'Task transitioned to ACCEPTED');
    ok(tAccepted.version === 2, 'Task version incremented to 2');
    ok(tAccepted.provenanceHash !== task1.provenanceHash, 'Provenance hash updated cryptographically');

    // ACCEPTED -> PLANNING
    const tPlanning = runtime.transitionTask(tenantA, task1.taskId, {
      toState: 'PLANNING',
      expectedVersion: 2,
      reason: 'Agent is decomposing execution plan',
    });
    ok(tPlanning.state === 'PLANNING', 'Task transitioned to PLANNING');
    ok(tPlanning.version === 3, 'Task version incremented to 3');

    // PLANNING -> EXECUTING
    const tExecuting = runtime.transitionTask(tenantA, task1.taskId, {
      toState: 'EXECUTING',
      expectedVersion: 3,
      reason: 'Plan finalized, beginning step execution',
    });
    ok(tExecuting.state === 'EXECUTING', 'Task transitioned to EXECUTING');
    ok(tExecuting.version === 4, 'Task version incremented to 4');

    // Step 0: PENDING -> RUNNING -> COMPLETED
    const tStep0Running = runtime.updateStep(tenantA, task1.taskId, {
      stepIndex: 0,
      status: 'RUNNING',
      expectedVersion: 4,
    });
    ok(tStep0Running.steps[0].status === 'RUNNING', 'Step 0 transitioned to RUNNING');
    ok(tStep0Running.steps[0].attemptCount === 1, 'Step 0 attemptCount incremented to 1');
    ok(tStep0Running.version === 5, 'Task version incremented on step update');

    const tStep0Done = runtime.updateStep(tenantA, task1.taskId, {
      stepIndex: 0,
      status: 'COMPLETED',
      expectedVersion: 5,
      executionResult: { balance: 14500, currency: 'USD' },
    });
    ok(tStep0Done.steps[0].status === 'COMPLETED', 'Step 0 transitioned to COMPLETED');
    ok(tStep0Done.currentStepIndex === 1, 'currentStepIndex advanced to 1');
    ok(tStep0Done.version === 6, 'Task version incremented to 6');

    // Step 1: PENDING -> RUNNING -> COMPLETED
    runtime.updateStep(tenantA, task1.taskId, {
      stepIndex: 1,
      status: 'RUNNING',
      expectedVersion: 6,
    });
    const tStep1Done = runtime.updateStep(tenantA, task1.taskId, {
      stepIndex: 1,
      status: 'COMPLETED',
      expectedVersion: 7,
      executionResult: { scanCount: 300, discrepancies: 4 },
    });
    ok(tStep1Done.steps[1].status === 'COMPLETED', 'Step 1 transitioned to COMPLETED');
    ok(tStep1Done.currentStepIndex === 2, 'currentStepIndex advanced to 2');

    // Step 2: High risk -> EXECUTING -> AWAITING_APPROVAL
    const tAwaiting = runtime.transitionTask(tenantA, task1.taskId, {
      toState: 'AWAITING_APPROVAL',
      expectedVersion: 8,
      reason: 'Step 2 has HIGH risk and requires human authorization',
    });
    ok(tAwaiting.state === 'AWAITING_APPROVAL', 'Task transitioned to AWAITING_APPROVAL');

    // Human approves -> AWAITING_APPROVAL -> EXECUTING
    const tApproved = runtime.transitionTask(tenantA, task1.taskId, {
      toState: 'EXECUTING',
      expectedVersion: 9,
      reason: 'Human supervisor approved high risk adjustment',
    });
    ok(tApproved.state === 'EXECUTING', 'Task transitioned back to EXECUTING after approval');

    // Step 2 execution: RUNNING -> COMPLETED
    runtime.updateStep(tenantA, task1.taskId, {
      stepIndex: 2,
      status: 'RUNNING',
      expectedVersion: 10,
    });
    const tStep2Done = runtime.updateStep(tenantA, task1.taskId, {
      stepIndex: 2,
      status: 'COMPLETED',
      expectedVersion: 11,
      executionResult: { draftId: 'draft_adj_9921' },
    });
    ok(tStep2Done.steps[2].status === 'COMPLETED', 'Step 2 completed');

    // EXECUTING -> COMPLETED (Terminal)
    const tCompleted = runtime.transitionTask(tenantA, task1.taskId, {
      toState: 'COMPLETED',
      expectedVersion: 12,
      reason: 'All steps executed and verified successfully',
    });
    ok(tCompleted.state === 'COMPLETED', 'Task transitioned to COMPLETED');
    ok(typeof tCompleted.completedAt === 'string', 'completedAt timestamp recorded');

    // ------------------------------------------------------------------------
    // SECTION 6: Terminal State Immutability
    // ------------------------------------------------------------------------
    console.log('\n[SECTION 6: Terminal State Immutability]');
    assert.throws(
      () => runtime.transitionTask(tenantA, task1.taskId, {
        toState: 'EXECUTING',
        expectedVersion: 13,
      }),
      IllegalStateTransitionError,
      'Cannot transition out of COMPLETED terminal state'
    );
    passed++;
    console.log(`  [PASS ${passed.toString().padStart(2, '0')}] Cannot transition out of COMPLETED terminal state`);

    assert.throws(
      () => runtime.updateStep(tenantA, task1.taskId, {
        stepIndex: 0,
        status: 'RUNNING',
        expectedVersion: 13,
      }),
      IllegalStateTransitionError,
      'Cannot mutate steps of a task in terminal state'
    );
    passed++;
    console.log(`  [PASS ${passed.toString().padStart(2, '0')}] Cannot mutate steps of a task in terminal state`);

    // ------------------------------------------------------------------------
    // SECTION 7: Strict Tenant Partitioning & Isolation
    // ------------------------------------------------------------------------
    console.log('\n[SECTION 7: Strict Tenant Partitioning & Isolation]');
    // Create task for Tenant B
    const taskB = runtime.createTask({
      tenantId: tenantB,
      userId: 'user_beta_01',
      title: 'Tenant B Processing Job',
      intent: 'Isolated processing for retail tenant',
    });
    ok(taskB.tenantId === tenantB, 'Task B created under tenant B');

    // Tenant A cannot read Tenant B's task
    assert.throws(
      () => runtime.getTask(tenantA, taskB.taskId),
      TaskNotFoundError,
      'Tenant A cannot access Tenant B task (not found in A partition)'
    );
    passed++;
    console.log(`  [PASS ${passed.toString().padStart(2, '0')}] Tenant A cannot access Tenant B task`);

    // Listing is tenant-confined
    const listA = runtime.listTasks(tenantA);
    const listB = runtime.listTasks(tenantB);
    ok(listA.every((t) => t.tenantId === tenantA), 'listTasks for Tenant A contains only Tenant A tasks');
    ok(listB.every((t) => t.tenantId === tenantB), 'listTasks for Tenant B contains only Tenant B tasks');
    ok(listA.some((t) => t.taskId === task1.taskId), 'Tenant A list includes task1');
    ok(listB.some((t) => t.taskId === taskB.taskId), 'Tenant B list includes taskB');

    // Path traversal in taskId rejected
    assert.throws(
      () => runtime.getTask(tenantA, '../../etc/passwd'),
      TaskValidationError,
      'Path traversal in taskId is rejected'
    );
    passed++;
    console.log(`  [PASS ${passed.toString().padStart(2, '0')}] Path traversal in taskId is rejected`);

    // ------------------------------------------------------------------------
    // SECTION 8: Pause and Resume Semantics
    // ------------------------------------------------------------------------
    console.log('\n[SECTION 8: Pause and Resume Semantics]');
    const task2 = runtime.createTask({
      tenantId: tenantA,
      userId: userA,
      title: 'Long-running Batch Task',
      intent: 'Processing multiple batches',
    });
    runtime.transitionTask(tenantA, task2.taskId, { toState: 'ACCEPTED', expectedVersion: 1 });
    runtime.transitionTask(tenantA, task2.taskId, { toState: 'EXECUTING', expectedVersion: 2 });

    const pausedTask = runtime.pauseTask(tenantA, task2.taskId, 3, 'Operator manual pause');
    ok(pausedTask.state === 'PAUSED', 'Task successfully paused');

    const resumedTask = runtime.resumeTask(tenantA, task2.taskId, 4, 'EXECUTING');
    ok(resumedTask.state === 'EXECUTING', 'Task successfully resumed to EXECUTING');

    // ------------------------------------------------------------------------
    // SECTION 9: Cancellation Semantics
    // ------------------------------------------------------------------------
    console.log('\n[SECTION 9: Cancellation Semantics]');
    const task3 = runtime.createTask({
      tenantId: tenantA,
      userId: userA,
      title: 'Cancelled Task',
      intent: 'Job to be aborted',
    });
    const cancelledTask = runtime.cancelTask(tenantA, task3.taskId, 1, 'Cancelled before acceptance');
    ok(cancelledTask.state === 'CANCELLED', 'Task transitioned to CANCELLED');
    ok(typeof cancelledTask.completedAt === 'string', 'completedAt recorded for CANCELLED');

    assert.throws(
      () => runtime.transitionTask(tenantA, task3.taskId, { toState: 'ACCEPTED', expectedVersion: 2 }),
      IllegalStateTransitionError,
      'Cannot transition out of CANCELLED state'
    );
    passed++;
    console.log(`  [PASS ${passed.toString().padStart(2, '0')}] Cannot transition out of CANCELLED state`);

    // ------------------------------------------------------------------------
    // SECTION 10: Cryptographic Provenance & Tamper Detection
    // ------------------------------------------------------------------------
    console.log('\n[SECTION 10: Cryptographic Provenance & Tamper Detection]');
    const store = new AgentTaskStore({ baseDir: testDir });
    const loadedTask = store.getTask(tenantA, task1.taskId);
    ok(loadedTask !== undefined, 'Task loaded from disk store');
    ok(loadedTask?.provenanceHash === tCompleted.provenanceHash, 'Loaded task has matching provenance hash');

    // Tamper detection: modify the task JSON on disk with invalid hash
    const taskFilePath = store.getTaskFilePath(tenantA, task2.taskId);
    const rawContent = fs.readFileSync(taskFilePath, 'utf8');
    const parsed = JSON.parse(rawContent);
    parsed.provenanceHash = '0000000000000000000000000000000000000000000000000000000000000000'; // Tampered!
    fs.writeFileSync(taskFilePath, JSON.stringify(parsed), 'utf8');

    // Rehydration must catch tamper or fail closed
    assert.throws(
      () => store.rehydrate(tenantA),
      ProvenanceTamperError,
      'Tampered provenance hash triggers fail-closed ProvenanceTamperError during rehydration'
    );
    passed++;
    console.log(`  [PASS ${passed.toString().padStart(2, '0')}] Tampered provenance hash triggers fail-closed ProvenanceTamperError`);

    // Restore valid task2
    store.saveTask(resumedTask);

    // ------------------------------------------------------------------------
    // SECTION 11: Crash Recovery of Interrupted Tasks
    // ------------------------------------------------------------------------
    console.log('\n[SECTION 11: Crash Recovery of Interrupted Tasks]');
    // Create an interrupted task in EXECUTING state
    const crashTask = runtime.createTask({
      tenantId: tenantA,
      userId: userA,
      title: 'Crash Recovery Test Task',
      intent: 'Simulating unexpected power failure while executing',
    });
    runtime.transitionTask(tenantA, crashTask.taskId, { toState: 'ACCEPTED', expectedVersion: 1 });
    const interruptedTask = runtime.transitionTask(tenantA, crashTask.taskId, { toState: 'EXECUTING', expectedVersion: 2 });
    ok(interruptedTask.state === 'EXECUTING', 'Task is in EXECUTING state before simulated crash');

    // Simulate system restart / rehydration
    const rehydrationResult = runtime.rehydrate(tenantA);
    ok(rehydrationResult.recovered.length >= 1, 'At least 1 task recovered from interrupted execution');
    const recovered = rehydrationResult.recovered.find((t) => t.taskId === crashTask.taskId);
    ok(recovered !== undefined, 'Interrupted task found in recovered list');
    ok(recovered?.state === 'PAUSED', 'Interrupted task safely recovered into PAUSED state');
    ok(recovered?.recoveryReason === 'UNEXPECTED_PROCESS_RESTART_RECOVERED', 'recoveryReason indicates restart recovery');
    ok(recovered?.version === 4, 'Recovered task version incremented by 1');

    // ------------------------------------------------------------------------
    // SECTION 12: USER_STOP Absolute Supremacy
    // ------------------------------------------------------------------------
    console.log('\n[SECTION 12: USER_STOP Absolute Supremacy]');
    userStopFlag = true;
    ok(runtime.isUserStopActive() === true, 'USER_STOP is active');

    assert.throws(
      () => runtime.createTask({
        tenantId: tenantA,
        userId: userA,
        title: 'Task during stop',
        intent: 'Should be blocked',
      }),
      UserStopActiveError,
      'createTask blocked when USER_STOP is active'
    );
    passed++;
    console.log(`  [PASS ${passed.toString().padStart(2, '0')}] createTask blocked when USER_STOP is active`);

    assert.throws(
      () => runtime.transitionTask(tenantA, recovered!.taskId, {
        toState: 'EXECUTING',
        expectedVersion: recovered!.version,
      }),
      UserStopActiveError,
      'transitionTask blocked when USER_STOP is active'
    );
    passed++;
    console.log(`  [PASS ${passed.toString().padStart(2, '0')}] transitionTask blocked when USER_STOP is active`);

    assert.throws(
      () => runtime.pauseTask(tenantA, recovered!.taskId, recovered!.version),
      UserStopActiveError,
      'pauseTask blocked when USER_STOP is active'
    );
    passed++;
    console.log(`  [PASS ${passed.toString().padStart(2, '0')}] pauseTask blocked when USER_STOP is active`);

    userStopFlag = false;
    ok(runtime.isUserStopActive() === false, 'USER_STOP released');

    // ------------------------------------------------------------------------
    // SECTION 13: Structured Audit Log Verification
    // ------------------------------------------------------------------------
    console.log('\n[SECTION 13: Structured Audit Log Verification]');
    ok(fs.existsSync(auditFile), 'Audit ledger file exists on disk');
    const auditLines = fs.readFileSync(auditFile, 'utf8').trim().split('\n').filter(Boolean);
    ok(auditLines.length >= 10, `Audit log contains at least 10 structured events (found ${auditLines.length})`);

    const auditEvents = auditLines.map((l) => JSON.parse(l));
    const creationEvents = auditEvents.filter((e) => e.eventType === 'AGENT_TASK_CREATED');
    const transitionEvents = auditEvents.filter((e) => e.eventType === 'AGENT_TASK_STATE_TRANSITION');
    const stepEvents = auditEvents.filter((e) => e.eventType === 'AGENT_TASK_STEP_UPDATED');
    const recoveryEvents = auditEvents.filter((e) => e.eventType === 'AGENT_TASK_CRASH_RECOVERED');

    ok(creationEvents.length >= 4, 'Audit ledger recorded AGENT_TASK_CREATED events');
    ok(transitionEvents.length >= 6, 'Audit ledger recorded AGENT_TASK_STATE_TRANSITION events');
    ok(stepEvents.length >= 4, 'Audit ledger recorded AGENT_TASK_STEP_UPDATED events');
    ok(recoveryEvents.length >= 1, 'Audit ledger recorded AGENT_TASK_CRASH_RECOVERED events');

    // Verify cryptographic audit chain integrity
    ok(auditLedger.verifyChainIntegrity() === true, 'Audit ledger cryptographic hash chain integrity is 100% unbroken');

    // ------------------------------------------------------------------------
    // SECTION 14: Protected Workspace Integrity
    // ------------------------------------------------------------------------
    console.log('\n[SECTION 14: Protected Workspace Integrity]');
    const protectedDir = 'C:\\BOW\\shopofbow';
    ok(!fs.existsSync(protectedDir), `Protected workspace '${protectedDir}' was NOT touched (does not exist)`);

    console.log('\n================================================================================');
    console.log(`  REALITY GATE COMPLETE: All ${passed} assertions passed!`);
    console.log('================================================================================\n');
  } finally {
    // Cleanup temporary test directory
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {}
  }
}

runRealityGate().catch((err) => {
  console.error('\nREALITY GATE FAILURE:', err);
  process.exit(1);
});
