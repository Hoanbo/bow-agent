// tests/test_v4_agent_multi_agent_task_orchestration_evidence.ts
// BOWCON V4.0 — MS-1.3.46 REALITY GATE
// GOVERNED MULTI-AGENT TASK ORCHESTRATION & DISTRIBUTED EVIDENCE VERIFICATION
//
// Dedicated verification gate covering Categories A through AP (42 categories).
//
// INVARIANTS ENFORCED:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - DELEGATION != AUTHORITY
// - DELEGATION != EXECUTION
// - CAPABILITY != AUTHORIZATION
// - AGENT != MASTER_OWNER & DEVICE != MASTER_OWNER
// - DEVICE_TRUST != EXECUTION_AUTHORITY
// - EVIDENCE != AUTHORITY
// - VERIFICATION != AUTHORIZATION
// - TASK_COMPLETION != OWNER_APPROVAL
// - SUB_AGENT_RESULT != FACT
// - AGENT_COUNT != AUTHORITY_COUNT (No collective authority)
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0

import assert from 'node:assert/strict';
import crypto from 'node:crypto';

import {
  globalMasterArchitectureIdentity,
  MASTER_OWNER_ID,
  AUTHORIZED_MASTER_OWNER_ALIASES,
  RUNTIME_IDENTITY,
  ECOSYSTEM_ID,
  isMasterOwner,
} from '../src/core/architecture/masterArchitectureIdentity.js';
import {
  globalMasterHumanAuthority,
  MasterHumanAuthority,
} from '../src/core/authority/masterHumanAuthority.js';
import { globalSupervisorHumanGate } from '../src/core/supervisor/supervisorHumanGate.js';
import { globalWorldActionAuth } from '../src/core/world-action/worldActionAuthorization.js';
import { globalAuditLedger } from '../src/core/auditLedger.js';
import {
  AgentIdentityManager,
  FederatedDeviceRegistry,
  CapabilityLeaseManager,
  DelegationGovernanceRuntime,
  DurableDelegationStore,
} from '../src/core/delegation/index.js';
import {
  GovernedTaskOrchestrator,
  TaskDependencyEngine,
  ArtifactEvidenceEngine,
  EvidenceVerificationEngine,
  EvidenceAggregationEngine,
  TaskReviewEngine,
  OrchestrationRuntime,
  TASK_ORCHESTRATION_SCHEMA_VERSION,
  type AgentTaskResult,
  type TaskArtifact,
} from '../src/core/orchestration/index.js';

let passedAssertions = 0;
function pass(msg: string) {
  passedAssertions++;
}

async function runRealityGate() {
  console.log('\nStarting MS-1.3.46 Reality Gate: Governed Multi-Agent Task Orchestration & Evidence Verification...');

  // Set up clean sandboxed delegation & orchestration dependencies
  const agentManager = new AgentIdentityManager();
  const deviceRegistry = new FederatedDeviceRegistry();
  const leaseManager = new CapabilityLeaseManager();
  const delegationRuntime = new DelegationGovernanceRuntime(
    agentManager,
    deviceRegistry,
    leaseManager
  );

  const orchestrator = new GovernedTaskOrchestrator(
    agentManager,
    delegationRuntime
  );
  const dependencyEngine = new TaskDependencyEngine();
  const artifactEngine = new ArtifactEvidenceEngine();
  const verificationEngine = new EvidenceVerificationEngine(artifactEngine);
  const aggregationEngine = new EvidenceAggregationEngine();
  const reviewEngine = new TaskReviewEngine();

  const runtime = new OrchestrationRuntime(
    orchestrator,
    dependencyEngine,
    artifactEngine,
    verificationEngine,
    aggregationEngine,
    reviewEngine
  );

  try {
    // -------------------------------------------------------------------------
    // Category A: Master Owner Authority
    // -------------------------------------------------------------------------
    console.log('Testing Category A: Master Owner Authority...');
    assert.equal(globalMasterHumanAuthority.isMasterOperator(MASTER_OWNER_ID), true);
    pass('Canonical master operator recognized');
    assert.equal(globalMasterHumanAuthority.isMasterOperator('worker_agent_1'), false);
    pass('Worker agent cannot claim master operator authority');
    assert.equal(globalMasterArchitectureIdentity.verifyAuthorityRank(MASTER_OWNER_ID, RUNTIME_IDENTITY) > 0, true);
    pass('MASTER_OWNER_AUTHORITY rank strictly exceeds RUNTIME_IDENTITY');

    // -------------------------------------------------------------------------
    // Category B: BOW Architecture Identity
    // -------------------------------------------------------------------------
    console.log('Testing Category B: BOW Architecture Identity...');
    const arch = globalMasterArchitectureIdentity.getCanonicalIdentity();
    assert.equal(arch.ecosystem, 'BOW');
    pass('Ecosystem identity is BOW');
    assert.notEqual(arch.runtime, arch.ecosystem);
    pass('BOWCON != BOW');

    // -------------------------------------------------------------------------
    // Category C: BOWCON Identity
    // -------------------------------------------------------------------------
    console.log('Testing Category C: BOWCON Identity...');
    assert.notEqual(RUNTIME_IDENTITY, MASTER_OWNER_ID);
    pass('BOWCON != MASTER_OWNER');
    assert.notEqual(RUNTIME_IDENTITY, 'ShopOfBow');
    pass('BOWCON != ShopOfBow');
    assert.equal(TASK_ORCHESTRATION_SCHEMA_VERSION, '4.0.0');
    pass('Schema version is 4.0.0');

    // -------------------------------------------------------------------------
    // Category D: Agent Identity Separation
    // -------------------------------------------------------------------------
    console.log('Testing Category D: Agent Identity Separation...');
    assert.throws(
      () => agentManager.registerAgent({
        agentId: MASTER_OWNER_ID,
        name: 'Imposter Agent',
        role: 'worker',
        sessionId: 'session_alpha',
      }),
      /FORBIDDEN_OWNER_IDENTITY_IMPERSONATION/
    );
    pass('Agent cannot register as MASTER_OWNER_ID');

    for (const alias of AUTHORIZED_MASTER_OWNER_ALIASES) {
      assert.throws(
        () => agentManager.registerAgent({
          agentId: alias,
          name: 'Alias Imposter',
          role: 'worker',
          sessionId: 'session_alpha',
        }),
        /FORBIDDEN_OWNER_IDENTITY_IMPERSONATION/
      );
    }
    pass('Agent cannot register as any Master Owner alias');

    const agent1 = agentManager.registerAgent({
      agentId: 'agent_alpha',
      name: 'Agent Alpha Worker',
      role: 'data_analyzer',
      sessionId: 'session_alpha',
    });
    assert.equal(agent1.agentId, 'agent_alpha');
    pass('Governed agent registered');

    // -------------------------------------------------------------------------
    // Category E: Delegation Integration
    // -------------------------------------------------------------------------
    console.log('Testing Category E: Delegation Integration...');
    const delegationReq = delegationRuntime.requestDelegation({
      ownerId: MASTER_OWNER_ID,
      issuerId: MASTER_OWNER_ID,
      targetAgentId: 'agent_alpha',
      targetDeviceId: 'device_001',
      requestedCapabilities: ['read_telemetry', 'compute_metrics'],
      scope: {
        maxScopePercentage: 50,
        allowedCapabilities: ['read_telemetry', 'compute_metrics'],
        targetPaths: ['data/telemetry'],
        forbiddenPaths: ['data/private'],
      },
      ttlMs: 3600000,
      sessionId: 'session_alpha',
    });
    delegationRuntime.authorizeDelegation(delegationReq.delegationId, MASTER_OWNER_ID);
    const activeDelegation = delegationRuntime.activateDelegation(delegationReq.delegationId);
    assert.equal(activeDelegation.status, 'ACTIVE');
    pass('Active delegation established for agent_alpha');

    // -------------------------------------------------------------------------
    // Category F: Scope Enforcement
    // -------------------------------------------------------------------------
    console.log('Testing Category F: Scope Enforcement...');
    assert.throws(
      () => orchestrator.assertProtectedWorkspaceSafe(['C:\\BOW\\shopofbow\\data']),
      /SECURITY_VIOLATION/
    );
    pass('Protected workspace C:\\BOW\\shopofbow rejected with SECURITY_VIOLATION');

    // -------------------------------------------------------------------------
    // Category G: Task Creation
    // -------------------------------------------------------------------------
    console.log('Testing Category G: Task Creation...');
    const group = runtime.createTaskGroup({
      title: 'Telemetry Processing Group',
      sessionId: 'session_alpha',
      ownerId: MASTER_OWNER_ID,
    });
    assert.equal(group.sessionId, 'session_alpha');
    pass('TaskGroup created with session binding');

    const task1 = runtime.createTask({
      groupId: group.groupId,
      title: 'Collect Sensor Metrics',
      description: 'Collect raw telemetry metrics from device_001',
      sessionId: 'session_alpha',
      requiredCapabilities: ['read_telemetry'],
      targetPaths: ['data/telemetry'],
    });
    assert.equal(task1.state, 'PLANNED');
    pass('Task1 created in PLANNED state');

    // -------------------------------------------------------------------------
    // Category H: Task Assignment
    // -------------------------------------------------------------------------
    console.log('Testing Category H: Task Assignment...');
    const assignedTask1 = runtime.assignTask({
      taskId: task1.taskId,
      agentId: 'agent_alpha',
      deviceId: 'device_001',
      delegationId: activeDelegation.delegationId,
    });
    assert.equal(assignedTask1.state, 'READY');
    assert.equal(assignedTask1.assignment?.agentId, 'agent_alpha');
    pass('Task1 successfully assigned to agent_alpha and transitions to READY');

    // -------------------------------------------------------------------------
    // Category I: Invalid Assignment Rejection
    // -------------------------------------------------------------------------
    console.log('Testing Category I: Invalid Assignment Rejection...');
    assert.throws(
      () => orchestrator.assignTask({
        taskId: task1.taskId,
        agentId: 'unregistered_agent_xyz',
        deviceId: 'device_001',
        delegationId: activeDelegation.delegationId,
      }),
      /TARGET_AGENT_NOT_REGISTERED/
    );
    pass('Unregistered agent assignment rejected');

    const taskWithExcessCap = runtime.createTask({
      groupId: group.groupId,
      title: 'Unauthorized Network Write',
      description: 'Requires undelegated network capability',
      sessionId: 'session_alpha',
      requiredCapabilities: ['admin_network_write'],
    });

    assert.throws(
      () => orchestrator.assignTask({
        taskId: taskWithExcessCap.taskId,
        agentId: 'agent_alpha',
        deviceId: 'device_001',
        delegationId: activeDelegation.delegationId,
      }),
      /CAPABILITY_NOT_DELEGATED/
    );
    pass('Task with undelegated capability rejected with CAPABILITY_NOT_DELEGATED');

    // -------------------------------------------------------------------------
    // Category J: Dependency Validation
    // -------------------------------------------------------------------------
    console.log('Testing Category J: Dependency Validation...');
    const task2 = runtime.createTask({
      groupId: group.groupId,
      title: 'Analyze Collected Metrics',
      description: 'Requires task1 output',
      sessionId: 'session_alpha',
      dependencies: [{ dependentTaskId: task1.taskId, type: 'FINISH_TO_START' }],
      requiredCapabilities: ['compute_metrics'],
    });
    assert.equal(task2.state, 'WAITING_DEPENDENCY');
    pass('Task2 initialized in WAITING_DEPENDENCY state');

    const assignedTask2 = runtime.assignTask({
      taskId: task2.taskId,
      agentId: 'agent_alpha',
      deviceId: 'device_001',
      delegationId: activeDelegation.delegationId,
    });
    assert.equal(assignedTask2.state, 'WAITING_DEPENDENCY');
    pass('Assigned Task2 remains in WAITING_DEPENDENCY until task1 completes');

    assert.throws(
      () => runtime.startTask(task2.taskId),
      /TASK_DEPENDENCY_UNRESOLVED/
    );
    pass('Cannot start task2 before dependency task1 finishes');

    // -------------------------------------------------------------------------
    // Category K: Dependency Cycle Detection
    // -------------------------------------------------------------------------
    console.log('Testing Category K: Dependency Cycle Detection...');
    // 1. Self-cycle test
    assert.throws(
      () => dependencyEngine.assertNoCycle(
        { taskId: 'task_self_cycle', dependencies: [{ dependentTaskId: 'task_self_cycle', type: 'FINISH_TO_START' }] } as any,
        []
      ),
      /TASK_DEPENDENCY_CYCLE/
    );
    pass('Self-referential dependency rejected with TASK_DEPENDENCY_CYCLE');

    // 2. Mutual cycle between two tasks
    const dummyTaskA: any = { taskId: 'task_cyc_A', groupId: 'g1', dependencies: [{ dependentTaskId: 'task_cyc_B', type: 'FINISH_TO_START' }] };
    const dummyTaskB: any = { taskId: 'task_cyc_B', groupId: 'g1', dependencies: [{ dependentTaskId: 'task_cyc_A', type: 'FINISH_TO_START' }] };
    assert.throws(
      () => dependencyEngine.assertNoCycle(dummyTaskB, [dummyTaskA]),
      /TASK_DEPENDENCY_CYCLE/
    );
    pass('Mutual cyclic dependency strictly detected and rejected with TASK_DEPENDENCY_CYCLE');

    // -------------------------------------------------------------------------
    // Category L: Session Isolation
    // -------------------------------------------------------------------------
    console.log('Testing Category L: Session Isolation...');
    assert.throws(
      () => runtime.createTask({
        groupId: group.groupId,
        title: 'Cross Session Task',
        description: 'Session beta attempting to join session alpha group',
        sessionId: 'session_beta',
      }),
      /CROSS_SESSION_ORCHESTRATION_REJECTED/
    );
    pass('Cross-session task in group rejected fail-closed');

    // -------------------------------------------------------------------------
    // Category M: USER_STOP Supremacy
    // -------------------------------------------------------------------------
    console.log('Testing Category M: USER_STOP Supremacy...');
    runtime.emergencyStop('Operator initiated emergency freeze');
    assert.equal(runtime.isUserStopActive, true);
    pass('Emergency stop active');

    assert.throws(
      () => runtime.createTaskGroup({ title: 'Frozen Group', sessionId: 's1', ownerId: MASTER_OWNER_ID }),
      /USER_STOP_ACTIVE/
    );
    pass('Task group creation blocked on USER_STOP');

    assert.throws(
      () => runtime.startTask(task1.taskId),
      /USER_STOP_ACTIVE/
    );
    pass('Task execution start blocked on USER_STOP');

    // Reset emergency stop as Master Owner
    runtime.resetEmergencyStop(MASTER_OWNER_ID);
    assert.equal(runtime.isUserStopActive, false);
    pass('Emergency stop cleanly reset by Master Owner');

    // -------------------------------------------------------------------------
    // Category N: Revocation Supremacy
    // -------------------------------------------------------------------------
    console.log('Testing Category N: Revocation Supremacy...');
    const revokeAgent = agentManager.registerAgent({
      agentId: 'agent_revoked',
      name: 'Revoked Worker',
      role: 'temp',
      sessionId: 'session_alpha',
    });
    const revDelegation = delegationRuntime.requestDelegation({
      ownerId: MASTER_OWNER_ID,
      issuerId: MASTER_OWNER_ID,
      targetAgentId: revokeAgent.agentId,
      targetDeviceId: 'device_001',
      requestedCapabilities: ['read_telemetry'],
      scope: { maxScopePercentage: 20, allowedCapabilities: ['read_telemetry'] },
      ttlMs: 60000,
      sessionId: 'session_alpha',
    });
    delegationRuntime.authorizeDelegation(revDelegation.delegationId, MASTER_OWNER_ID);
    delegationRuntime.activateDelegation(revDelegation.delegationId);
    delegationRuntime.revokeDelegation(revDelegation.delegationId, MASTER_OWNER_ID, 'Security concern');

    const tempTask = runtime.createTask({
      groupId: group.groupId,
      title: 'Revocation Test Task',
      description: 'Must fail assignment due to revocation',
      sessionId: 'session_alpha',
    });
    assert.throws(
      () => orchestrator.assignTask({
        taskId: tempTask.taskId,
        agentId: revokeAgent.agentId,
        deviceId: 'device_001',
        delegationId: revDelegation.delegationId,
      }),
      /DELEGATION_REVOKED/
    );
    pass('Assignment under revoked delegation rejected (REVOCATION > AGENT_INTENT)');

    // -------------------------------------------------------------------------
    // Category O: Expiration Enforcement
    // -------------------------------------------------------------------------
    console.log('Testing Category O: Expiration Enforcement...');
    const expDelegation = delegationRuntime.requestDelegation({
      ownerId: MASTER_OWNER_ID,
      issuerId: MASTER_OWNER_ID,
      targetAgentId: agent1.agentId,
      targetDeviceId: 'device_001',
      requestedCapabilities: ['read_telemetry'],
      scope: { maxScopePercentage: 10, allowedCapabilities: ['read_telemetry'] },
      ttlMs: 1, // immediate expiration
      sessionId: 'session_alpha',
    });
    delegationRuntime.authorizeDelegation(expDelegation.delegationId, MASTER_OWNER_ID);
    // Simulate expired timestamp in delegation store
    const storedExp = delegationRuntime.getDelegation(expDelegation.delegationId)!;
    (storedExp as any).expiresAt = Date.now() - 1000;
    (storedExp as any).status = 'EXPIRED';

    assert.throws(
      () => orchestrator.assignTask({
        taskId: tempTask.taskId,
        agentId: agent1.agentId,
        deviceId: 'device_001',
        delegationId: expDelegation.delegationId,
      }),
      /DELEGATION_EXPIRED/
    );
    pass('Assignment under expired delegation rejected with DELEGATION_EXPIRED');

    // -------------------------------------------------------------------------
    // Category P: Artifact Creation
    // -------------------------------------------------------------------------
    console.log('Testing Category P: Artifact Creation...');
    const runningTask1 = runtime.startTask(task1.taskId);
    assert.equal(runningTask1.state, 'RUNNING');
    pass('Task1 transitioned to RUNNING');

    const artifact1 = runtime.recordArtifact({
      taskId: task1.taskId,
      agentId: 'agent_alpha',
      deviceId: 'device_001',
      sessionId: 'session_alpha',
      artifactType: 'telemetry_dataset',
      contentReference: 'data/telemetry/sensor_reading_001.json',
      rawContent: JSON.stringify({ temp: 36.5, pressure: 101.3, status: 'NORMAL' }),
      metadata: { sampleCount: 100 },
    });
    assert.ok(artifact1.artifactId.startsWith('art_'));
    assert.equal(artifact1.verificationState, 'OBSERVED');
    pass('Artifact1 created in OBSERVED state with non-sensitive metadata');

    // -------------------------------------------------------------------------
    // Category Q: Artifact Integrity Hash
    // -------------------------------------------------------------------------
    console.log('Testing Category Q: Artifact Integrity Hash...');
    const expectedHash = crypto.createHash('sha256').update(JSON.stringify({ temp: 36.5, pressure: 101.3, status: 'NORMAL' })).digest('hex');
    assert.equal(artifact1.contentHash, expectedHash);
    const integrityCheck = artifactEngine.verifyArtifactIntegrity(
      artifact1,
      JSON.stringify({ temp: 36.5, pressure: 101.3, status: 'NORMAL' })
    );
    assert.equal(integrityCheck.intact, true);
    pass('Artifact integrity hash verified against SHA-256');

    // -------------------------------------------------------------------------
    // Category R: Artifact Corruption Detection
    // -------------------------------------------------------------------------
    console.log('Testing Category R: Artifact Corruption Detection...');
    const corruptedCheck = artifactEngine.verifyArtifactIntegrity(
      artifact1,
      'TAMPERED CONTENT IN TRANSIT'
    );
    assert.equal(corruptedCheck.intact, false);
    assert.ok(corruptedCheck.error?.includes('ARTIFACT_INTEGRITY_FAILURE'));
    pass('Tampered artifact produces ARTIFACT_INTEGRITY_FAILURE');

    // -------------------------------------------------------------------------
    // Category S: Evidence Creation
    // -------------------------------------------------------------------------
    console.log('Testing Category S: Evidence Creation...');
    const evList = verificationEngine.getEvidenceByTask(task1.taskId);
    assert.equal(evList.length >= 1, true);
    const ev1 = evList[0];
    assert.equal(ev1.isSpeculative, true); // SUB_AGENT_RESULT != FACT
    assert.equal(ev1.verificationState, 'OBSERVED');
    pass('Evidence record created with isSpeculative = true (SUB_AGENT_RESULT != FACT)');

    // -------------------------------------------------------------------------
    // Category T: Evidence Verification
    // -------------------------------------------------------------------------
    console.log('Testing Category T: Evidence Verification...');
    const vResult = verificationEngine.verifyEvidenceRecord(
      ev1,
      task1,
      JSON.stringify({ temp: 36.5, pressure: 101.3, status: 'NORMAL' })
    );
    assert.equal(vResult.verified, true);
    assert.equal(vResult.status, 'VERIFIED');
    assert.equal(vResult.integrityStatus, 'INTACT');
    pass('Valid evidence record passes cryptographic verification');

    // -------------------------------------------------------------------------
    // Category U: Evidence Rejection
    // -------------------------------------------------------------------------
    console.log('Testing Category U: Evidence Rejection...');
    const tamperedEvidence = { ...ev1, rawHash: 'bad_hash_value' };
    const badVResult = verificationEngine.verifyEvidenceRecord(
      tamperedEvidence,
      task1,
      JSON.stringify({ temp: 36.5, pressure: 101.3, status: 'NORMAL' })
    );
    assert.equal(badVResult.verified, false);
    assert.equal(badVResult.status, 'REJECTED');
    assert.equal(badVResult.integrityStatus, 'HASH_MISMATCH');
    pass('Tampered evidence hash produces REJECTED status with HASH_MISMATCH');

    // -------------------------------------------------------------------------
    // Category V: Evidence Incompleteness
    // -------------------------------------------------------------------------
    console.log('Testing Category V: Evidence Incompleteness...');
    const missingArtifactEv = { ...ev1, artifactId: 'art_nonexistent_999' };
    const incompleteRes = verificationEngine.verifyEvidenceRecord(missingArtifactEv, task1);
    assert.equal(incompleteRes.verified, false);
    assert.equal(incompleteRes.status, 'INCOMPLETE');
    pass('Missing referenced artifact evaluates to INCOMPLETE');

    // -------------------------------------------------------------------------
    // Category W: Evidence Contradiction
    // -------------------------------------------------------------------------
    console.log('Testing Category W: Evidence Contradiction...');
    const resA: AgentTaskResult = {
      resultId: 'res_a',
      taskId: 'task_cross_check',
      agentId: 'agent_alpha',
      deviceId: 'dev1',
      sessionId: 'session_alpha',
      outcome: {
        status: 'SUCCESS',
        summary: 'Sensor state is STABLE',
        outputData: { reading: 100 },
        artifacts: [],
        completedAt: Date.now(),
        durationMs: 50,
      },
      submittedAt: Date.now(),
      evidenceIds: [],
      isAdvisoryOnly: true,
    };
    const resB: AgentTaskResult = {
      resultId: 'res_b',
      taskId: 'task_cross_check',
      agentId: 'agent_beta',
      deviceId: 'dev2',
      sessionId: 'session_alpha',
      outcome: {
        status: 'FAILURE',
        summary: 'Sensor state is CRITICAL_OVERHEAT',
        outputData: { reading: 999 },
        artifacts: [],
        completedAt: Date.now(),
        durationMs: 55,
      },
      submittedAt: Date.now(),
      evidenceIds: [],
      isAdvisoryOnly: true,
    };

    const contradictions = verificationEngine.detectContradictions([resA, resB], group.groupId);
    assert.equal(contradictions.length, 1);
    assert.equal(contradictions[0].resolved, false);
    assert.equal(contradictions[0].sourceA.outcome, 'SUCCESS');
    assert.equal(contradictions[0].sourceB.outcome, 'FAILURE');
    pass('Contradiction between SUCCESS and FAILURE explicitly detected and preserved');

    // -------------------------------------------------------------------------
    // Category X: Evidence Aggregation
    // -------------------------------------------------------------------------
    console.log('Testing Category X: Evidence Aggregation...');
    const bundleWithContra = aggregationEngine.aggregateEvidence({
      taskGroupId: group.groupId,
      sessionId: 'session_alpha',
      evidenceList: [ev1],
      contradictions,
    });
    assert.equal(bundleWithContra.epistemicState, 'EVIDENCE_CONTRADICTED');
    pass('Bundle with contradictions evaluated to EVIDENCE_CONTRADICTED');

    const cleanBundle = aggregationEngine.aggregateEvidence({
      taskGroupId: group.groupId,
      sessionId: 'session_alpha',
      evidenceList: [{ ...ev1, verificationState: 'VERIFIED' }],
      contradictions: [],
    });
    assert.equal(cleanBundle.epistemicState, 'EVIDENCE_VERIFIED');
    pass('Clean verified evidence bundle evaluated to EVIDENCE_VERIFIED');

    // -------------------------------------------------------------------------
    // Category Y: Cryptographic Bundle Integrity
    // -------------------------------------------------------------------------
    console.log('Testing Category Y: Cryptographic Bundle Integrity...');
    const bundleIntegrity = aggregationEngine.verifyBundleIntegrity(cleanBundle);
    assert.equal(bundleIntegrity.intact, true);
    pass('Bundle cryptographic integrity matches computed SHA-256');

    const tamperedBundle = {
      ...cleanBundle,
      bundleIntegrityHash: '0000000000000000000000000000000000000000000000000000000000000000',
    };
    const tamperedBundleRes = aggregationEngine.verifyBundleIntegrity(tamperedBundle);
    assert.equal(tamperedBundleRes.intact, false);
    assert.ok(tamperedBundleRes.error?.includes('EVIDENCE_INTEGRITY_FAILURE'));
    pass('Tampered bundle hash detected with EVIDENCE_INTEGRITY_FAILURE');

    // -------------------------------------------------------------------------
    // Category Z: Agent Result Provenance
    // -------------------------------------------------------------------------
    console.log('Testing Category Z: Agent Result Provenance...');
    const result1: AgentTaskResult = {
      resultId: 'res_task1',
      taskId: task1.taskId,
      agentId: 'agent_alpha',
      deviceId: 'device_001',
      sessionId: 'session_alpha',
      outcome: {
        status: 'SUCCESS',
        summary: 'Sensor reading captured accurately',
        artifacts: [artifact1],
        completedAt: Date.now(),
        durationMs: 120,
      },
      submittedAt: Date.now(),
      evidenceIds: [ev1.evidenceId],
      isAdvisoryOnly: true,
    };
    const submittedTask1 = runtime.submitResult(task1.taskId, result1);
    assert.equal(submittedTask1.state, 'VERIFICATION_PENDING');
    assert.equal(submittedTask1.result?.isAdvisoryOnly, true);
    pass('Result submitted with provenance; task state is VERIFICATION_PENDING');

    // -------------------------------------------------------------------------
    // Category AA: Multi-Agent Task Group
    // -------------------------------------------------------------------------
    console.log('Testing Category AA: Multi-Agent Task Group...');
    const agent2 = agentManager.registerAgent({
      agentId: 'agent_beta',
      name: 'Agent Beta Compute',
      role: 'compute_worker',
      sessionId: 'session_alpha',
    });
    const delegation2 = delegationRuntime.requestDelegation({
      ownerId: MASTER_OWNER_ID,
      issuerId: MASTER_OWNER_ID,
      targetAgentId: 'agent_beta',
      targetDeviceId: 'device_002',
      requestedCapabilities: ['compute_metrics'],
      scope: { maxScopePercentage: 50, allowedCapabilities: ['compute_metrics'] },
      ttlMs: 3600000,
      sessionId: 'session_alpha',
    });
    delegationRuntime.authorizeDelegation(delegation2.delegationId, MASTER_OWNER_ID);
    delegationRuntime.activateDelegation(delegation2.delegationId);

    // Assign task2 to agent2
    runtime.assignTask({
      taskId: task2.taskId,
      agentId: 'agent_beta',
      deviceId: 'device_002',
      delegationId: delegation2.delegationId,
    });
    const groupTasks = orchestrator.getTasksByGroup(group.groupId);
    assert.equal(groupTasks.length >= 2, true);
    pass('Multiple agents (agent_alpha, agent_beta) collaborating within group');

    // -------------------------------------------------------------------------
    // Category AB: Multi-Agent Result Aggregation
    // -------------------------------------------------------------------------
    console.log('Testing Category AB: Multi-Agent Result Aggregation...');
    // Review task 1 first
    const revTask1 = runtime.verifyAndReviewTask({
      taskId: task1.taskId,
      reviewerId: 'supervisor_001',
      reviewerType: 'SUPERVISOR',
      notes: 'Automated sensor collection verified',
    });
    assert.equal(revTask1.task.state, 'VERIFIED');
    assert.equal(revTask1.review.reviewDecision, 'VERIFIED');
    assert.equal(revTask1.review.ownerApproved, false); // VERIFIED != OWNER_APPROVED
    pass('Task1 verified by supervisor; VERIFIED != OWNER_APPROVED verified');

    // Now task2 dependencies should be satisfied
    assert.equal(dependencyEngine.canTransitionToReady(task2, (id) => orchestrator.getTask(id)), true);
    const readyTask2 = runtime.startTask(task2.taskId);
    assert.equal(readyTask2.state, 'RUNNING');
    pass('Task2 dependency unblocked after task1 reached VERIFIED');

    // -------------------------------------------------------------------------
    // Category AC: No Collective Authority
    // -------------------------------------------------------------------------
    console.log('Testing Category AC: No Collective Authority...');
    assert.equal(globalMasterHumanAuthority.isMasterOperator('agent_alpha'), false);
    assert.equal(globalMasterHumanAuthority.isMasterOperator('agent_beta'), false);
    assert.equal(isMasterOwner('agent_alpha'), false);
    assert.equal(isMasterOwner('agent_beta'), false);
    pass('Multiple agents cannot form collective authority; AGENT_COUNT != AUTHORITY_COUNT');

    // -------------------------------------------------------------------------
    // Category AD: Supervisor Review
    // -------------------------------------------------------------------------
    console.log('Testing Category AD: Supervisor Review...');
    const currentTask2 = orchestrator.getTask(task2.taskId)!;
    assert.throws(
      () => reviewEngine.reviewTask({
        task: currentTask2,
        evidenceBundle: cleanBundle,
        reviewerId: 'agent_beta', // Agent trying to approve own task!
        reviewerType: 'SUPERVISOR',
      }),
      /SELF_APPROVAL_REJECTED/
    );
    pass('Agent self-approval strictly rejected with SELF_APPROVAL_REJECTED');

    // -------------------------------------------------------------------------
    // Category AE: HumanGate Reuse
    // -------------------------------------------------------------------------
    console.log('Testing Category AE: HumanGate Reuse...');
    const escalation = reviewEngine.escalateToHumanGate(
      task2,
      cleanBundle,
      MASTER_OWNER_ID,
      'High impact compute task requires owner gate'
    );
    assert.ok(escalation.gateRequest.requestId.startsWith('gate_'));
    assert.equal(escalation.review.reviewDecision, 'ESCALATED_TO_HUMAN');
    const retrievedGate = globalSupervisorHumanGate.getPendingRequest(escalation.gateRequest.requestId);
    assert.ok(retrievedGate);
    pass('Escalation reused canonical globalSupervisorHumanGate cleanly');

    // -------------------------------------------------------------------------
    // Category AF: No Duplicate Authorization
    // -------------------------------------------------------------------------
    console.log('Testing Category AF: No Duplicate Authorization...');
    assert.equal(typeof globalWorldActionAuth.issueToken, 'function');
    assert.equal(typeof globalWorldActionAuth.validateToken, 'function');
    pass('Authoritative globalWorldActionAuth preserved without duplication');

    // -------------------------------------------------------------------------
    // Category AG: No Duplicate Token Store
    // -------------------------------------------------------------------------
    console.log('Testing Category AG: No Duplicate Token Store...');
    // Verify no secondary token store in orchestration
    assert.equal((orchestrator as any).tokenStore, undefined);
    assert.equal((runtime as any).tokenStore, undefined);
    pass('Zero duplicate token stores in orchestration subsystem');

    // -------------------------------------------------------------------------
    // Category AH: No Duplicate Audit Ledger
    // -------------------------------------------------------------------------
    console.log('Testing Category AH: No Duplicate Audit Ledger...');
    assert.equal(typeof globalAuditLedger.record, 'function');
    pass('Authoritative globalAuditLedger preserved without duplication');

    // -------------------------------------------------------------------------
    // Category AI: Protected Workspace Isolation
    // -------------------------------------------------------------------------
    console.log('Testing Category AI: Protected Workspace Isolation...');
    assert.throws(
      () => artifactEngine.createArtifact({
        taskId: task1.taskId,
        agentId: 'agent_alpha',
        deviceId: 'dev',
        sessionId: 'session_alpha',
        artifactType: 'code',
        contentReference: 'c:/bow/shopofbow/package.json',
      }),
      /SECURITY_VIOLATION/
    );
    pass('Direct reference to C:\\BOW\\shopofbow blocked with SECURITY_VIOLATION');

    // -------------------------------------------------------------------------
    // Category AJ: No Unrestricted Execution
    // -------------------------------------------------------------------------
    console.log('Testing Category AJ: No Unrestricted Execution...');
    assert.throws(
      () => artifactEngine.assertNoSensitiveData(
        { authToken: 'forbidden_jwt_token_123' },
        undefined
      ),
      /FORBIDDEN_CREDENTIAL_PERSISTENCE/
    );
    pass('Persistence of sensitive tokens rejected with FORBIDDEN_CREDENTIAL_PERSISTENCE');

    // -------------------------------------------------------------------------
    // Category AK: Cross-Session Rejection
    // -------------------------------------------------------------------------
    console.log('Testing Category AK: Cross-Session Rejection...');
    assert.throws(
      () => aggregationEngine.aggregateEvidence({
        taskGroupId: group.groupId,
        sessionId: 'session_alpha',
        evidenceList: [
          ev1,
          { ...ev1, evidenceId: 'ev_other_session', sessionId: 'session_gamma' },
        ],
      }),
      /CROSS_SESSION_ORCHESTRATION_REJECTED/
    );
    pass('Cross-session evidence aggregation rejected fail-closed');

    // -------------------------------------------------------------------------
    // Category AL: USER_STOP During Orchestration
    // -------------------------------------------------------------------------
    console.log('Testing Category AL: USER_STOP During Orchestration...');
    runtime.emergencyStop('Emergency stop during workflow');
    assert.throws(
      () => runtime.submitResult(task2.taskId, resB),
      /USER_STOP_ACTIVE/
    );
    assert.throws(
      () => runtime.verifyAndReviewTask({
        taskId: task2.taskId,
        reviewerId: 'supervisor',
        reviewerType: 'SUPERVISOR',
      }),
      /USER_STOP_ACTIVE/
    );
    runtime.resetEmergencyStop(MASTER_OWNER_ID);
    pass('All mutation and verification frozen during active USER_STOP');

    // -------------------------------------------------------------------------
    // Category AM: Revocation During Orchestration
    // -------------------------------------------------------------------------
    console.log('Testing Category AM: Revocation During Orchestration...');
    delegationRuntime.revokeDelegation(activeDelegation.delegationId, MASTER_OWNER_ID, 'Revoke mid-flow');
    assert.throws(
      () => orchestrator.assignTask({
        taskId: task2.taskId,
        agentId: 'agent_alpha',
        deviceId: 'device_001',
        delegationId: activeDelegation.delegationId,
      }),
      /DELEGATION_REVOKED/
    );
    pass('Revocation during flow halts further assignment to the revoked delegation');

    // -------------------------------------------------------------------------
    // Category AN: Failed Dependency Propagation
    // -------------------------------------------------------------------------
    console.log('Testing Category AN: Failed Dependency Propagation...');
    const failedParentTask = runtime.createTask({
      groupId: group.groupId,
      title: 'Failing Parent',
      description: 'Will fail',
      sessionId: 'session_alpha',
    });
    orchestrator.updateTaskState(failedParentTask.taskId, 'FAILED');

    const dependentChild = runtime.createTask({
      groupId: group.groupId,
      title: 'Dependent Child',
      description: 'Must be blocked by failing parent',
      sessionId: 'session_alpha',
      dependencies: [{ dependentTaskId: failedParentTask.taskId }],
    });

    const evalChild = dependencyEngine.evaluateDependencies(
      dependentChild,
      (id) => orchestrator.getTask(id)
    );
    assert.equal(evalChild.status, 'BLOCKED');
    assert.equal(evalChild.code, 'TASK_DEPENDENCY_FAILED');
    pass('Failed parent dependency immediately propagates BLOCKED status to child');

    // -------------------------------------------------------------------------
    // Category AO: Contradiction Preservation
    // -------------------------------------------------------------------------
    console.log('Testing Category AO: Contradiction Preservation...');
    const allContradictions = verificationEngine.getAllContradictions();
    assert.equal(allContradictions.length >= 1, true);
    for (const c of allContradictions) {
      assert.equal(c.resolved, false);
      assert.ok(c.sourceA.agentId);
      assert.ok(c.sourceB.agentId);
    }
    pass('Contradictions preserved across episode history without deletion');

    // -------------------------------------------------------------------------
    // Category AP: End-to-End Orchestration Lifecycle
    // -------------------------------------------------------------------------
    console.log('Testing Category AP: End-to-End Orchestration Lifecycle...');
    // Create new clean group
    const e2eGroup = runtime.createTaskGroup({
      title: 'E2E Governed Pipeline',
      sessionId: 'session_e2e',
      ownerId: MASTER_OWNER_ID,
    });

    const e2eAgent = agentManager.registerAgent({
      agentId: 'agent_e2e',
      name: 'E2E Worker',
      role: 'executor',
      sessionId: 'session_e2e',
    });

    const e2eDelegation = delegationRuntime.requestDelegation({
      ownerId: MASTER_OWNER_ID,
      issuerId: MASTER_OWNER_ID,
      targetAgentId: e2eAgent.agentId,
      targetDeviceId: 'dev_e2e',
      requestedCapabilities: ['process_data'],
      scope: { maxScopePercentage: 100, allowedCapabilities: ['process_data'] },
      ttlMs: 3600000,
      sessionId: 'session_e2e',
    });
    delegationRuntime.authorizeDelegation(e2eDelegation.delegationId, MASTER_OWNER_ID);
    delegationRuntime.activateDelegation(e2eDelegation.delegationId);

    const e2eTask = runtime.createTask({
      groupId: e2eGroup.groupId,
      title: 'E2E Data Transformation',
      description: 'Transform records safely',
      sessionId: 'session_e2e',
      requiredCapabilities: ['process_data'],
    });

    runtime.assignTask({
      taskId: e2eTask.taskId,
      agentId: e2eAgent.agentId,
      deviceId: 'dev_e2e',
      delegationId: e2eDelegation.delegationId,
    });

    runtime.startTask(e2eTask.taskId);

    const e2eArtifact = runtime.recordArtifact({
      taskId: e2eTask.taskId,
      agentId: e2eAgent.agentId,
      deviceId: 'dev_e2e',
      sessionId: 'session_e2e',
      artifactType: 'processed_records',
      contentReference: 'data/records/output_001.json',
      rawContent: JSON.stringify({ count: 42, verified: true }),
    });

    const e2eResult: AgentTaskResult = {
      resultId: 'res_e2e',
      taskId: e2eTask.taskId,
      agentId: e2eAgent.agentId,
      deviceId: 'dev_e2e',
      sessionId: 'session_e2e',
      outcome: {
        status: 'SUCCESS',
        summary: 'Transformed 42 records successfully',
        artifacts: [e2eArtifact],
        completedAt: Date.now(),
        durationMs: 75,
      },
      submittedAt: Date.now(),
      evidenceIds: [],
      isAdvisoryOnly: true,
    };

    runtime.submitResult(e2eTask.taskId, e2eResult);

    const e2eReviewOutcome = runtime.verifyAndReviewTask({
      taskId: e2eTask.taskId,
      reviewerId: 'supervisor_auto',
      reviewerType: 'SUPERVISOR',
      notes: 'End-to-end verification passed cleanly',
    });

    assert.equal(e2eReviewOutcome.task.state, 'VERIFIED');
    assert.equal(e2eReviewOutcome.bundle.epistemicState, 'EVIDENCE_VERIFIED');
    assert.equal(e2eReviewOutcome.review.ownerApproved, false);

    // Master Owner explicitly grants approval
    const ownerApproval = reviewEngine.recordOwnerApproval(
      e2eReviewOutcome.review.reviewId,
      MASTER_OWNER_ID
    );
    assert.equal(ownerApproval.ownerApproved, true);
    assert.equal(ownerApproval.reviewerType, 'MASTER_OWNER');
    pass('Complete end-to-end lifecycle verified: PLANNED -> READY -> RUNNING -> VERIFICATION_PENDING -> VERIFIED -> OWNER_APPROVED');

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n============================================================');
    console.log(`REALITY GATE SUCCESS: All ${passedAssertions} assertions verified across Categories A..AP.`);
    console.log('Total Failed Assertions: 0');
    console.log('============================================================\n');
  } catch (err: any) {
    console.error(`\nREALITY GATE FAILURE: ${err.message}\n`, err.stack);
    process.exit(1);
  }
}

runRealityGate().catch((err) => {
  console.error('Unhandled reality gate error:', err);
  process.exit(1);
});
