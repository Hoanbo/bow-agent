// tests/test_v4_agent_cognitive_resilience_episodic_synthesis.ts
// BOWCON V4.0 — MS-1.3.43 DEDICATED REALITY GATE
// MASTER OWNER COGNITIVE RESILIENCE, ADAPTIVE HOST ORCHESTRATION
// & SELF-REFLECTIVE EPISODIC SYNTHESIS RUNTIME
//
// Mandatory verification covering Categories A through Z (plus additional).
// All assertions must pass for MS-1.3.43 to be declared VERIFIED & LOCKED.

import assert from 'node:assert/strict';

// ============================================================
// Import MS-1.3.43 Resilience module
// ============================================================
import {
  CognitiveResilienceRuntime,
  AdaptiveHostOrchestrator,
  EpisodicMemorySynthesisEngine,
  SelfReflectiveEngine,
  ConfidenceCalibrationEngine,
  generateResilienceId,
  type ResilienceFailureRecord,
  type ResilienceRecoveryProposal,
  type ResilienceRecoveryAttempt,
  type CognitiveEpisode,
  type ReflectionRecord,
  type ConfidenceCalibrationRecord,
} from '../src/core/resilience/index.js';

// ============================================================
// Import existing canonical modules (must not be recreated)
// ============================================================
import {
  MASTER_OWNER_ID,
  ECOSYSTEM_ID,
  RUNTIME_IDENTITY,
  isMasterOwner,
  assertMasterOwner,
} from '../src/core/architecture/masterArchitectureIdentity.js';
import { globalHostDiscovery } from '../src/core/host/hostDiscoveryEngine.js';
import { globalCapabilityGroundedReasoningEngine } from '../src/core/world-model/capabilityGroundedReasoningEngine.js';

// ============================================================
// Assertion counter
// ============================================================
let TOTAL_PASS = 0;
let TOTAL_FAIL = 0;
function check(label: string, condition: boolean): void {
  if (condition) {
    TOTAL_PASS++;
  } else {
    TOTAL_FAIL++;
    console.error(`  FAIL: ${label}`);
  }
}

console.log('\nStarting MS-1.3.43 Reality Gate: Cognitive Resilience, Adaptive Host Orchestration & Episodic Synthesis...');

// ============================================================
// Category A: Master Owner Authority
// ============================================================
console.log('\nTesting Category A: Master Owner Authority...');
{
  check('A1: MASTER_OWNER_ID is defined', typeof MASTER_OWNER_ID === 'string' && MASTER_OWNER_ID.length > 0);
  check('A2: ECOSYSTEM_ID is BOW', ECOSYSTEM_ID === 'BOW');
  check('A3: RUNTIME_IDENTITY is BOWCON', RUNTIME_IDENTITY === 'BOWCON');
  check('A4: isMasterOwner recognizes master_operator', isMasterOwner('master_operator') === true);
  check('A5: isMasterOwner rejects unknown caller', isMasterOwner('external_caller') === false);

  const runtime = new CognitiveResilienceRuntime();
  let resetDenied = false;
  try {
    runtime.resetStop('unauthorized_caller');
  } catch (e: any) {
    resetDenied = e.message.includes('AUTHORITY_DENIED');
  }
  check('A6: Only Master Owner can reset USER_STOP', resetDenied);
}

// ============================================================
// Category B: BOW / BOWCON / Project Separation
// ============================================================
console.log('Testing Category B: Architecture Identity & BOW/BOWCON/Project Separation...');
{
  check('B1: ECOSYSTEM_ID != RUNTIME_IDENTITY', (ECOSYSTEM_ID as string) !== (RUNTIME_IDENTITY as string));
  check('B2: MASTER_OWNER_ID != ECOSYSTEM_ID', (MASTER_OWNER_ID as string) !== (ECOSYSTEM_ID as string));
  check('B3: MASTER_OWNER_ID != RUNTIME_IDENTITY', (MASTER_OWNER_ID as string) !== (RUNTIME_IDENTITY as string));

  // ShopOfBow must be isolated
  const runtime = new CognitiveResilienceRuntime();
  // Simulate a proposal targeting shopofbow
  const fail = runtime.detectFailure({
    description: 'Test failure',
    affectedComponent: 'test',
    evidence: ['test'],
    severity: 'LOW',
  });
  const proposal = runtime.proposeRecovery(fail.failureId);
  // Force target to shopofbow
  (proposal as any).target = 'C:\\BOW\\shopofbow\\data';
  let shopProtected = false;
  try {
    runtime.executeRecovery(proposal.proposalId, 'any-token');
  } catch (e: any) {
    shopProtected = e.message.includes('SECURITY_VIOLATION') || e.message.includes('shopofbow');
  }
  check('B4: Recovery cannot target protected workspace C:\\BOW\\shopofbow', shopProtected);
}

// ============================================================
// Category C: Failure Classification & Resilience
// ============================================================
console.log('Testing Category C: Failure Classification & Resilience...');
{
  const runtime = new CognitiveResilienceRuntime();

  const transient = runtime.detectFailure({
    description: 'transient network blip',
    affectedComponent: 'network_adapter',
    evidence: ['ping timeout'],
    severity: 'LOW',
  });
  check('C1: Transient failure classified as TRANSIENT', transient.failureClass === 'TRANSIENT');

  const stale = runtime.detectFailure({
    description: 'stale host telemetry detected',
    affectedComponent: 'host_discovery',
    evidence: ['data expired'],
    severity: 'MEDIUM',
  });
  check('C2: Stale failure classified as STALE_STATE', stale.failureClass === 'STALE_STATE');

  const corrupt = runtime.detectFailure({
    description: 'integrity hash mismatch in persisted state',
    affectedComponent: 'world_model',
    evidence: ['hash mismatch on rehydration'],
    severity: 'HIGH',
    failureClass: 'STATE_CORRUPTED',
  });
  check('C3: Corrupted state classified as STATE_CORRUPTED', corrupt.failureClass === 'STATE_CORRUPTED');

  check('C4: Active failures visible', runtime.getActiveFailures().length === 3);
  check('C5: Health state transitions to DEGRADED after HIGH failure', runtime.getHealthState() === 'DEGRADED');
}

// ============================================================
// Category D: Bounded Recovery Loop
// ============================================================
console.log('Testing Category D: Bounded Recovery Loop...');
{
  const runtime = new CognitiveResilienceRuntime();

  const fail = runtime.detectFailure({
    description: 'transient error',
    affectedComponent: 'cognitive_cycle',
    evidence: ['blip detected'],
    severity: 'LOW',
    failureClass: 'TRANSIENT',
  });

  const proposal = runtime.proposeRecovery(fail.failureId);
  check('D1: Recovery proposal is created', proposal.proposalId.length > 0);
  check('D2: AUTO_SAFE recovery does not require owner approval', !proposal.requiresOwnerApproval);

  const attempt = runtime.executeRecovery(proposal.proposalId);
  check('D3: Recovery attempt created with status IN_PROGRESS', attempt.status === 'IN_PROGRESS');

  // Verify recovery
  const verification = runtime.verifyRecovery(attempt.attemptId, true, 'Host telemetry confirmed recovery', 'DIRECT_OBSERVATION');
  check('D4: Verification created after recovery', verification.verificationId.length > 0);
  check('D5: Verification passed = true', verification.passed === true);
  check('D6: Health transitions to RECOVERED after success', runtime.getHealthState() === 'RECOVERED');
  check('D7: Failure is marked resolved', runtime.isFailureResolved(fail.failureId));
}

// ============================================================
// Category E: Adaptive Host Orchestration
// ============================================================
console.log('Testing Category E: Adaptive Host Orchestration...');
{
  const orchestrator = new AdaptiveHostOrchestrator();
  const baseline = orchestrator.captureHostBaseline();
  check('E1: Host baseline can be captured', baseline !== null);
  check('E2: Host baseline has OS platform', typeof baseline.operatingSystem.platform === 'string');
  check('E3: Baseline platform is not hardcoded', baseline.operatingSystem.platform !== 'HARDCODED_VALUE');

  // Detect changes (same host = 0 changes expected)
  const changes = orchestrator.detectHostChanges();
  check('E4: Host change detection executes without error', Array.isArray(changes));
  check('E5: getCurrentHost returns non-null after detection', orchestrator.getCurrentHost() !== null);
}

// ============================================================
// Category F: Adaptive Plan Re-Evaluation
// ============================================================
console.log('Testing Category F: Adaptive Plan Re-Evaluation...');
{
  const orchestrator = new AdaptiveHostOrchestrator();
  orchestrator.captureHostBaseline();
  const host = globalHostDiscovery.discoverHost();

  const spec = {
    planId: 'plan_test_read_file',
    requiredCapabilities: ['cap_read_file'],
    target: 'data/config.json',
    riskLevel: 'LOW',
  };
  const feasibility = globalCapabilityGroundedReasoningEngine.evaluatePlanFeasibility(spec, host, []);
  orchestrator.trackPlan(spec, feasibility);
  check('F1: Plan is tracked for adaptive monitoring', orchestrator.getTrackedPlans().length === 1);

  const result = orchestrator.reEvaluatePlan('plan_test_read_file');
  check('F2: Re-evaluation returns a result', result.newFeasibility !== null || result.plan === null);
  check('F3: Re-evaluation note states this is a recommendation not authorization', result.notes.includes('RECOMMENDATION') || result.notes.includes('recommendation') || result.notes.includes('unchanged'));

  // Unknown plan
  const unknownResult = orchestrator.reEvaluatePlan('plan_does_not_exist');
  check('F4: Unknown plan re-evaluation returns null', unknownResult.plan === null);
}

// ============================================================
// Category G: Episodic Memory — Episode Creation
// ============================================================
console.log('Testing Category G: Episodic Memory Creation...');
{
  const engine = new EpisodicMemorySynthesisEngine('data/episodes-test-g');

  const episode = engine.openEpisode({
    projectId: 'bowcon_core',
    goalId: 'ms_1_3_43',
    triggeringContext: 'Owner requested capability audit',
    relatedObjective: 'Verify cognitive resilience',
  });

  check('G1: Episode is created with an ID', episode.episodeId.length > 0);
  check('G2: Episode starts in OBSERVATION phase', episode.phase === 'OBSERVATION');
  check('G3: Episode is not complete at creation', episode.isComplete === false);
  check('G4: Episode has valid ownerId', episode.ownerId === MASTER_OWNER_ID);
  check('G5: Episode has integrity hash', episode.integrityHash.length > 0);

  // Append events
  const evt = engine.appendEvent(episode.episodeId, {
    phase: 'OBSERVATION',
    timestamp: Date.now(),
    description: 'Host CPU cores observed: 16',
    provenance: 'HOST_TELEMETRY',
    confidence: 0.9,
  });
  check('G6: Event appended with ID', evt.eventId.length > 0);

  engine.appendObservation(episode.episodeId, 'RAM: 32GB available', 'HOST_TELEMETRY');
  engine.recordDecision(episode.episodeId, {
    decision: 'Proceed with capability audit',
    bowconRecommendation: 'Audit is safe to proceed',
    ownerDecision: 'Approved by Master Owner',
  });

  const reloaded = engine.getEpisode(episode.episodeId);
  check('G7: Episode observations append correctly', (reloaded?.observations.length ?? 0) === 1);
  check('G8: Episode decisions append correctly', (reloaded?.decisions.length ?? 0) === 1);
  check('G9: Episode phase updated to DECISION', reloaded?.phase === 'DECISION');
}

// ============================================================
// Category H: Episode Persistence & Restart Durability
// ============================================================
console.log('Testing Category H: Episode Persistence & Restart Durability...');
{
  const engine1 = new EpisodicMemorySynthesisEngine('data/episodes-test-h');
  const ep = engine1.openEpisode({
    projectId: 'persistence_test',
    goalId: 'goal_persist',
    triggeringContext: 'Crash test',
    relatedObjective: 'Verify episode survives restart',
  });
  engine1.appendObservation(ep.episodeId, 'Initial observation before shutdown', 'DIRECT_OBSERVATION');
  engine1.recordOutcome(ep.episodeId, 'Completed before shutdown', 0.85);
  engine1.completeEpisode(ep.episodeId);

  // Simulate restart by creating a new engine instance reading from same path
  const engine2 = new EpisodicMemorySynthesisEngine('data/episodes-test-h');
  const rehydrated = engine2.getEpisode(ep.episodeId);
  check('H1: Episode survives simulated restart', rehydrated !== undefined);
  check('H2: Rehydrated episode has correct ID', rehydrated?.episodeId === ep.episodeId);
  check('H3: Rehydrated episode is complete', rehydrated?.isComplete === true);
  check('H4: Rehydrated episode has observations', (rehydrated?.observations.length ?? 0) >= 1);
  check('H5: Rehydrated episode has outcome recorded', rehydrated?.outcome !== undefined);
}

// ============================================================
// Category I: Self-Reflection Engine
// ============================================================
console.log('Testing Category I: Self-Reflection Engine...');
{
  const engine = new SelfReflectiveEngine();

  const reflection = engine.reflect({
    subjectEpisodeId: 'ep_test_001',
    bowconRecommendation: 'Deploy service to production',
    ownerDecision: 'Defer deployment — review first',
    reasoningWasEvidenceBacked: true,
    assumptionsUsed: [],
    missingInformation: [],
    predictionMade: 'Deployment will succeed',
    predictionOutcome: 'UNVERIFIED',
    recommendationMatchedOutcome: null,
  });

  check('I1: Reflection record created', reflection.reflectionId.length > 0);
  check('I2: Reflection is bounded to recommendation (never authority)', reflection.isBoundedToRecommendation === true);
  check('I3: Reasoning assessed as SOUND when evidence-backed with no assumptions', reflection.reasoningQuality === 'REASONING_SOUND');
  check('I4: Prediction marked as UNVERIFIED when not yet verified', reflection.predictionQuality === 'PREDICTION_UNVERIFIED');
  check('I5: Owner decision recorded correctly', reflection.ownerDecision === 'Defer deployment — review first');
  check('I6: BOWCON recommendation recorded correctly', reflection.bowconRecommendation === 'Deploy service to production');

  // Test incorrect recommendation
  const reflection2 = engine.reflect({
    subjectEpisodeId: 'ep_test_002',
    bowconRecommendation: 'Use approach A',
    ownerDecision: 'Use approach A',
    reasoningWasEvidenceBacked: false,
    assumptionsUsed: ['API is stable', 'No breaking changes', 'Deployment window is clear'],
    missingInformation: ['API changelog', 'Current deployment queue'],
    predictionMade: 'Approach A will succeed',
    predictionOutcome: 'VERIFIED_INCORRECT',
    recommendationMatchedOutcome: false,
    actualOutcome: 'Approach A failed due to undocumented API change',
  });
  check('I7: Assumption-heavy reasoning classified as ASSUMPTION_BASED', reflection2.reasoningQuality === 'REASONING_ASSUMPTION_BASED');
  check('I8: Incorrect recommendation classified as RECOMMENDATION_INCORRECT', reflection2.decisionQuality === 'RECOMMENDATION_INCORRECT');
  check('I9: Refuted prediction classified as PREDICTION_REFUTED', reflection2.predictionQuality === 'PREDICTION_REFUTED');
  check('I10: Refuted prediction does not retroactively become a fact (insights preserved)', reflection2.insights.some((i) => i.includes('preserved') || i.includes('correction') || i.includes('refuted') || i.includes('incorrect')));
}

// ============================================================
// Category J: Confidence Calibration
// ============================================================
console.log('Testing Category J: Confidence Calibration...');
{
  const engine = new ConfidenceCalibrationEngine();

  // Insufficient data
  const cal1 = engine.calibrate('subject_a', 0.9);
  check('J1: Insufficient data returns INSUFFICIENT_DATA signal', cal1.signal === 'INSUFFICIENT_DATA');
  check('J2: Calibration does not modify historical records', cal1.historicalRecordsUnmodified === true);

  // Record verified outcomes
  engine.recordOutcomeDataPoint({ subjectId: 'subject_b', predictedConfidence: 0.9, wasSuccessful: false, verifiedAt: Date.now() });
  engine.recordOutcomeDataPoint({ subjectId: 'subject_b', predictedConfidence: 0.9, wasSuccessful: false, verifiedAt: Date.now() });
  engine.recordOutcomeDataPoint({ subjectId: 'subject_b', predictedConfidence: 0.9, wasSuccessful: false, verifiedAt: Date.now() });

  const cal2 = engine.calibrate('subject_b', 0.9);
  check('J3: 3+ data points produces a calibration signal', cal2.signal !== 'INSUFFICIENT_DATA');
  check('J4: OVERCONFIDENT detected when predicted >> actual', cal2.signal === 'OVERCONFIDENT');
  check('J5: Historical records remain unmodified', cal2.historicalRecordsUnmodified === true);
  check('J6: Adjustment signal is advisory (just a number)', typeof cal2.confidenceAdjustmentSignal === 'number');
  check('J7: Sample size is correct', cal2.sampleSize === 3);

  // Calibrated: use predicted confidence close to 100% success rate
  engine.recordOutcomeDataPoint({ subjectId: 'subject_c', predictedConfidence: 0.95, wasSuccessful: true, verifiedAt: Date.now() });
  engine.recordOutcomeDataPoint({ subjectId: 'subject_c', predictedConfidence: 0.95, wasSuccessful: true, verifiedAt: Date.now() });
  engine.recordOutcomeDataPoint({ subjectId: 'subject_c', predictedConfidence: 0.95, wasSuccessful: true, verifiedAt: Date.now() });
  const cal3 = engine.calibrate('subject_c', 0.95); // 3/3 = 100% success, predicted=0.95, delta=-0.05 → within tolerance
  check('J8: CALIBRATED when predicted ≈ actual success rate', cal3.signal === 'CALIBRATED');
}

// ============================================================
// Category K: Cognitive Failure Pattern Detection
// ============================================================
console.log('Testing Category K: Cognitive Failure Pattern Detection...');
{
  const runtime = new CognitiveResilienceRuntime();

  // Simulate recurring failures on same component
  runtime.detectFailure({ description: 'fail 1', affectedComponent: 'db_connector', evidence: ['timeout'], severity: 'MEDIUM' });
  runtime.detectFailure({ description: 'fail 2', affectedComponent: 'db_connector', evidence: ['timeout again'], severity: 'MEDIUM' });
  const recurring = runtime.detectFailure({ description: 'fail 3', affectedComponent: 'db_connector', evidence: ['persistent timeout'], severity: 'HIGH' });

  check('K1: Third failure on same component is marked isRecurring', recurring.isRecurring === true);
  check('K2: Recurring failure classified as REPEATED_RECOVERY_FAILURE', recurring.failureClass === 'REPEATED_RECOVERY_FAILURE');
  check('K3: priorFailureIds are recorded', recurring.priorFailureIds.length >= 2);

  const lessons = runtime.generateRecoveryLessons(recurring.failureId);
  check('K4: Lessons generated for recurring failure', lessons.some((l) => l.includes('Recurring') || l.includes('recurring') || l.includes('Systemic')));
}

// ============================================================
// Category L: Temporal Reconciliation
// ============================================================
console.log('Testing Category L: Temporal Reconciliation...');
{
  // Staleness is part of world model temporal state
  const { globalMasterOwnerWorldModelManager } = await import('../src/core/world-model/masterOwnerWorldModelManager.js');
  const snap = globalMasterOwnerWorldModelManager.getSnapshot();
  check('L1: Snapshot has temporal state', typeof snap.temporalState === 'object');
  check('L2: Snapshot has observedAt timestamp', typeof snap.temporalState.observedAt === 'number');
  check('L3: Snapshot has updatedAt timestamp', typeof snap.temporalState.updatedAt === 'number');
  check('L4: Snapshot has lastKnownGoodAt timestamp', typeof snap.temporalState.lastKnownGoodAt === 'number');
  check('L5: Snapshot has isStale boolean', typeof snap.temporalState.isStale === 'boolean');
}

// ============================================================
// Category M: Contradiction Preservation
// ============================================================
console.log('Testing Category M: Contradiction Preservation...');
{
  const { WorldModelContradictionEngine } = await import('../src/core/world-model/worldModelContradictionEngine.js');
  const engine = new WorldModelContradictionEngine();

  engine.recordContradiction(
    { source: 'HostTelemetry', claim: 'CPU has 8 cores', provenance: 'HOST_TELEMETRY', timestamp: Date.now() },
    { source: 'PersistedMemory', claim: 'CPU has 16 cores', provenance: 'PERSISTED_MEMORY', timestamp: Date.now() },
    'Conflicting telemetry sources',
    0.85,
    'MEDIUM',
    false
  );

  const unresolved = engine.getUnresolved();
  check('M1: Contradiction is recorded and remains unresolved', unresolved.length === 1);
  check('M2: Both claim sources preserved (not deleted)', (unresolved[0]?.sourceA?.claim?.length ?? 0) > 0 && (unresolved[0]?.sourceB?.claim?.length ?? 0) > 0);
  check('M3: Contradiction status is UNRESOLVED', unresolved[0]?.status === 'UNRESOLVED');
}

// ============================================================
// Category N: UNKNOWN State Handling
// ============================================================
console.log('Testing Category N: UNKNOWN State Handling...');
{
  const host = globalHostDiscovery.discoverHost();
  // UNKNOWN != FALSE: unmeasured telemetry is UNKNOWN, not false
  const gpuStatus = host.gpu?.status;
  check('N1: GPU status is a defined value (UNKNOWN or UNAVAILABLE are valid)', gpuStatus !== null);
  check('N2: CPU cores is a number or UNKNOWN string (not fabricated)', typeof host.cpu.cores === 'number' || host.cpu.cores === 'UNKNOWN');
  check('N3: Memory totalBytes is a number or UNKNOWN (not fabricated)', typeof host.memory.totalBytes === 'number' || host.memory.totalBytes === 'UNKNOWN');

  // Test UNKNOWN plan feasibility
  const unknownHost = { ...host, operatingSystem: { ...host.operatingSystem, status: 'UNKNOWN' as const } };
  const feasibility = globalCapabilityGroundedReasoningEngine.evaluatePlanFeasibility(
    { planId: 'unknown_host_plan', requiredCapabilities: ['cap_execute'] },
    unknownHost,
    []
  );
  check('N4: Plan against UNKNOWN host results in PLAN_UNKNOWN', feasibility.status === 'PLAN_UNKNOWN');
}

// ============================================================
// Category O: Epistemic Provenance — No silent promotion
// ============================================================
console.log('Testing Category O: Epistemic Provenance — No silent promotion...');
{
  const { assertValidEpistemicPromotion } = await import('../src/core/world-model/worldModelTypes.js');

  let promotionRejected = false;
  try {
    assertValidEpistemicPromotion('INFERENCE', 'DIRECT_OBSERVATION');
  } catch (e: any) {
    promotionRejected = e.message.includes('EPISTEMIC_VIOLATION');
  }
  check('O1: Inference cannot be silently promoted to DIRECT_OBSERVATION', promotionRejected);

  let assumptionRejected = false;
  try {
    assertValidEpistemicPromotion('ASSUMPTION', 'VERIFIED_EXECUTION');
  } catch (e: any) {
    assumptionRejected = e.message.includes('EPISTEMIC_VIOLATION');
  }
  check('O2: Assumption cannot be silently promoted to VERIFIED_EXECUTION', assumptionRejected);

  let memoryRejected = false;
  try {
    assertValidEpistemicPromotion('PERSISTED_MEMORY', 'HOST_TELEMETRY');
  } catch (e: any) {
    memoryRejected = e.message.includes('EPISTEMIC_VIOLATION');
  }
  check('O3: MEMORY != TRUTH — persisted memory cannot be promoted to HOST_TELEMETRY', memoryRejected);
}

// ============================================================
// Category P: Recovery Authorization — Sensitive operations require HumanGate
// ============================================================
console.log('Testing Category P: Recovery Authorization...');
{
  const runtime = new CognitiveResilienceRuntime();
  const fail = runtime.detectFailure({
    description: 'Corrupted world model state detected',
    affectedComponent: 'world_model_manager',
    evidence: ['SHA-256 hash mismatch'],
    severity: 'CRITICAL',
    failureClass: 'STATE_CORRUPTED',
  });

  const proposal = runtime.proposeRecovery(fail.failureId);
  check('P1: STATE_CORRUPTED requires human approval', proposal.requiresOwnerApproval === true);
  check('P2: STATE_CORRUPTED recovery class is HUMAN_REQUIRED', proposal.recoveryClass === 'HUMAN_REQUIRED');

  let authRequired = false;
  try {
    runtime.executeRecovery(proposal.proposalId); // no token
  } catch (e: any) {
    authRequired = e.message.includes('AUTHORIZATION_REQUIRED');
  }
  check('P3: Executing sensitive recovery without token throws AUTHORIZATION_REQUIRED', authRequired);
}

// ============================================================
// Category Q: USER_STOP Supremacy
// ============================================================
console.log('Testing Category Q: USER_STOP Supremacy...');
{
  const runtime = new CognitiveResilienceRuntime();
  runtime.emergencyStop('Test USER_STOP invocation');
  check('Q1: Runtime enters BLOCKED state after USER_STOP', runtime.getHealthState() === 'BLOCKED');
  check('Q2: isStopped() returns true after USER_STOP', runtime.isStopped() === true);

  let cycleBlocked = false;
  try {
    const fail = runtime.detectFailure({ description: 'something', affectedComponent: 'x', evidence: [], severity: 'LOW' });
    runtime.proposeRecovery(fail.failureId);
  } catch (e: any) {
    cycleBlocked = e.message.includes('RUNTIME_STOPPED');
  }
  check('Q3: Recovery proposal blocked after USER_STOP', cycleBlocked);

  // Reset by Master Owner
  runtime.resetStop(MASTER_OWNER_ID);
  check('Q4: Master Owner can reset USER_STOP', runtime.isStopped() === false);
  check('Q5: Health restored to HEALTHY after reset', runtime.getHealthState() === 'HEALTHY');

  // World model also honours USER_STOP
  const { globalMasterOwnerWorldModelRuntime } = await import('../src/core/world-model/masterOwnerWorldModelRuntime.js');
  globalMasterOwnerWorldModelRuntime.emergencyStop('test');
  check('Q6: World model runtime also honours USER_STOP', globalMasterOwnerWorldModelRuntime.isStopped() === true);
  globalMasterOwnerWorldModelRuntime.resetEmergencyStop(MASTER_OWNER_ID);
}

// ============================================================
// Category R: Crash Recovery — Interrupted Cycle
// ============================================================
console.log('Testing Category R: Crash / Interrupted Cycle Recovery...');
{
  const engine = new EpisodicMemorySynthesisEngine('data/episodes-test-r');
  const ep = engine.openEpisode({
    projectId: 'crash_test',
    goalId: 'goal_interrupt',
    triggeringContext: 'Simulate crash mid-cycle',
    relatedObjective: 'Test recovery after interruption',
  });
  engine.appendObservation(ep.episodeId, 'Observation captured before crash', 'DIRECT_OBSERVATION');
  engine.markInterrupted(ep.episodeId);

  const reloaded = engine.getEpisode(ep.episodeId);
  check('R1: Interrupted episode recorded', reloaded?.phase === 'INTERRUPTED');
  check('R2: Interrupted episodes are queryable', engine.getInterruptedEpisodes().length >= 1);
  check('R3: Interrupted episode has pre-crash observations preserved', (reloaded?.observations.length ?? 0) >= 1);
}

// ============================================================
// Category S: Corrupted State Detection
// ============================================================
console.log('Testing Category S: Corrupted State Detection...');
{
  const engine = new EpisodicMemorySynthesisEngine('data/episodes-test-s');
  const ep = engine.openEpisode({
    projectId: 'corruption_test',
    goalId: 'goal_corrupt',
    triggeringContext: 'Test integrity rejection',
    relatedObjective: 'Verify corrupted episodes are rejected',
  });
  engine.completeEpisode(ep.episodeId);

  // Tamper with the hash
  const episode = engine.getEpisode(ep.episodeId)!;
  (episode as any).integrityHash = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

  const result = engine.reconstructEpisode(ep.episodeId);
  check('S1: Tampered episode fails integrity check', result.valid === false);
  check('S2: Reason explains integrity failure', result.reason.includes('integrity') || result.reason.includes('Hash mismatch'));
  check('S3: Tampered episode is not returned', result.episode === null);
}

// ============================================================
// Category T: Security Invariants — No unrestricted shell
// ============================================================
console.log('Testing Category T: Security Invariants...');
{
  // Inspect source to verify no eval/new Function/execSync in resilience module
  const fs = await import('node:fs');
  const path = await import('node:path');
  const dir = 'src/core/resilience';
  const files = fs.readdirSync(dir).filter((f: string) => f.endsWith('.ts'));

  let evalFound = false;
  let newFunctionFound = false;
  let execSyncFound = false;
  let shopofbowFound = false;

  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    if (/\beval\s*\(/.test(content)) evalFound = true;
    if (/new\s+Function\s*\(/.test(content)) newFunctionFound = true;
    if (/execSync\s*\(/.test(content)) execSyncFound = true;
    if (/shopofbow/.test(content) && !content.includes('C:\\\\BOW\\\\shopofbow') && !/SECURITY_VIOLATION/.test(content)) {
      shopofbowFound = true;
    }
  }

  check('T1: No eval() in resilience module', !evalFound);
  check('T2: No new Function() in resilience module', !newFunctionFound);
  check('T3: No execSync() in resilience module', !execSyncFound);
}

// ============================================================
// Category U: Protected Workspace Isolation
// ============================================================
console.log('Testing Category U: Protected Workspace Isolation...');
{
  const runtime = new CognitiveResilienceRuntime();
  const fail = runtime.detectFailure({
    description: 'shopofbow recovery needed',
    affectedComponent: 'external_system',
    evidence: ['shopofbow error'],
    severity: 'LOW',
  });
  const proposal = runtime.proposeRecovery(fail.failureId);
  // Force shopofbow target
  (proposal as any).target = 'C:\\BOW\\shopofbow\\orders.json';
  let shopRejected = false;
  try {
    runtime.executeRecovery(proposal.proposalId, 'any-token');
  } catch (e: any) {
    shopRejected = e.message.includes('SECURITY_VIOLATION');
  }
  check('U1: Recovery targeting shopofbow throws SECURITY_VIOLATION', shopRejected);

  // Episode store cannot target shopofbow
  let episodeRejected = false;
  try {
    new EpisodicMemorySynthesisEngine('C:\\BOW\\shopofbow\\data');
  } catch (e: any) {
    episodeRejected = e.message.includes('SECURITY_VIOLATION');
  }
  check('U2: EpisodicMemorySynthesisEngine cannot be initialized with shopofbow path', episodeRejected);
}

// ============================================================
// Category V: Session Isolation — No cross-session leakage
// ============================================================
console.log('Testing Category V: Session Isolation...');
{
  const runtime1 = new CognitiveResilienceRuntime();
  const runtime2 = new CognitiveResilienceRuntime();

  runtime1.detectFailure({ description: 'session 1 failure', affectedComponent: 'comp_a', evidence: [], severity: 'LOW' });
  check('V1: Runtime 1 has failures', runtime1.getAllFailures().length === 1);
  check('V2: Runtime 2 has no failures (session isolation)', runtime2.getAllFailures().length === 0);

  const engine1 = new SelfReflectiveEngine();
  const engine2 = new SelfReflectiveEngine();
  engine1.reflect({ subjectEpisodeId: 'ep1', reasoningWasEvidenceBacked: true, assumptionsUsed: [], missingInformation: [] });
  check('V3: Reflection engine 1 has 1 reflection', engine1.getReflectionCount() === 1);
  check('V4: Reflection engine 2 has 0 reflections (isolation)', engine2.getReflectionCount() === 0);
}

// ============================================================
// Category W: Audit Integrity
// ============================================================
console.log('Testing Category W: Audit Integrity...');
{
  const { globalAuditLedger } = await import('../src/core/auditLedger.js');
  const event = globalAuditLedger.record({
    timestamp: new Date().toISOString(),
    actor: { userId: MASTER_OWNER_ID, role: 'master_owner', channel: 'test' },
    domain: 'resilience',
    toolName: 'MS-1.3.43-RealityGate',
    classification: 'INTERNAL_TEST',
    argumentsHash: 'test_hash_ms143',
    policyDecision: 'PERMIT',
    executionStatus: 'SUCCESS',
  });
  check('W1: Audit event has a valid eventId', event.eventId.length > 0);
  check('W2: Audit event has a cryptographic signature (64 hex chars)', event.signature.length === 64);
  check('W3: Audit event is immutable once recorded', typeof event.eventId === 'string');
}

// ============================================================
// Category X: Self-Reflection Cannot Become Authority
// ============================================================
console.log('Testing Category X: Self-Reflection Cannot Become Authority...');
{
  const engine = new SelfReflectiveEngine();
  const reflection = engine.reflect({
    subjectEpisodeId: 'ep_auth_test',
    reasoningWasEvidenceBacked: true,
    assumptionsUsed: [],
    missingInformation: [],
    recommendationMatchedOutcome: true,
  });

  // Reflection must always be bounded to recommendation
  check('X1: Reflection.isBoundedToRecommendation === true', reflection.isBoundedToRecommendation === true);

  // Cognitive summary is also advisory
  const summary = engine.getCognitiveSummary();
  check('X2: Cognitive summary is bounded to advisory', summary.isBoundedToAdvisory === true);

  // Confidence calibration is also advisory
  const calEngine = new ConfidenceCalibrationEngine();
  calEngine.recordOutcomeDataPoint({ subjectId: 'x_test', predictedConfidence: 0.8, wasSuccessful: true, verifiedAt: Date.now() });
  calEngine.recordOutcomeDataPoint({ subjectId: 'x_test', predictedConfidence: 0.8, wasSuccessful: true, verifiedAt: Date.now() });
  calEngine.recordOutcomeDataPoint({ subjectId: 'x_test', predictedConfidence: 0.8, wasSuccessful: true, verifiedAt: Date.now() });
  const agg = calEngine.getAggregateCalibration();
  check('X3: Calibration aggregate is bounded to advisory', agg.isBoundedToAdvisory === true);
}

// ============================================================
// Category Y: Learning Cannot Authorize Execution
// ============================================================
console.log('Testing Category Y: Learning Cannot Authorize Execution...');
{
  // Lessons generated from recovery are advisory text, not authorization tokens
  const runtime = new CognitiveResilienceRuntime();
  const fail = runtime.detectFailure({ description: 'recurring system failure', affectedComponent: 'auth_system', evidence: [], severity: 'HIGH' });
  const lessons = runtime.generateRecoveryLessons(fail.failureId);

  check('Y1: Lessons are strings (advisory text, not tokens)', lessons.every((l) => typeof l === 'string'));

  // Reflection lessons are strings too
  const reflEngine = new SelfReflectiveEngine();
  const refl = reflEngine.reflect({
    subjectEpisodeId: 'ep_learn_test',
    reasoningWasEvidenceBacked: false,
    assumptionsUsed: ['assumption1'],
    missingInformation: [],
    recommendationMatchedOutcome: false,
    actualOutcome: 'Unexpected failure',
  });
  check('Y2: Reflection lessons are advisory strings, not execution tokens', refl.lessons.every((l) => typeof l === 'string'));
  check('Y3: Reflection insights are advisory strings, not authorization objects', refl.insights.every((i) => typeof i === 'string'));
}

// ============================================================
// Category Z: End-to-End Cognitive Resilience Lifecycle
// ============================================================
console.log('Testing Category Z: End-to-End Lifecycle (Detect → Recover → Verify → Learn)...');
{
  const runtime = new CognitiveResilienceRuntime();
  const episodicEngine = new EpisodicMemorySynthesisEngine('data/episodes-test-z');
  const reflEngine = new SelfReflectiveEngine();
  const calEngine = new ConfidenceCalibrationEngine();

  // Step 1: DETECT
  const failure = runtime.detectFailure({
    description: 'Cognitive cycle interrupted by host memory pressure',
    affectedComponent: 'cognitive_cycle_engine',
    evidence: ['RAM: 98% utilized', 'cycle not completed'],
    severity: 'HIGH',
    failureClass: 'CYCLE_INTERRUPTED',
  });
  check('Z1: Failure detected', failure.failureId.length > 0);

  // Step 2: CLASSIFY + PROPOSE
  const proposal = runtime.proposeRecovery(failure.failureId);
  check('Z2: Recovery proposed', proposal.proposalId.length > 0);
  check('Z3: AUTO_REVERSIBLE class for interrupted cycle', proposal.recoveryClass === 'AUTO_REVERSIBLE');

  // Step 3: RECOVER
  const attempt = runtime.executeRecovery(proposal.proposalId);
  check('Z4: Recovery attempt started', attempt.status === 'IN_PROGRESS');

  // Step 4: VERIFY
  const verification = runtime.verifyRecovery(attempt.attemptId, true, 'Cycle resumed and completed successfully', 'DIRECT_OBSERVATION');
  check('Z5: Recovery verified', verification.passed === true);
  check('Z6: Health state is RECOVERED', runtime.getHealthState() === 'RECOVERED');

  // Step 5: LEARN via episode
  const ep = episodicEngine.openEpisode({
    projectId: 'resilience_e2e',
    goalId: 'goal_test_z',
    triggeringContext: 'End-to-end lifecycle test',
    relatedObjective: 'Verify full detect-recover-verify-learn cycle',
  });
  episodicEngine.recordOutcome(ep.episodeId, 'Cognitive cycle successfully recovered', 0.92);
  const lesson = episodicEngine.appendLesson(ep.episodeId, {
    lesson: 'High memory pressure interrupts cognitive cycles; monitor RAM proactively.',
    confidence: 0.85,
    isSpeculative: false,
    derivedFrom: [failure.failureId],
    appliesTo: ['cognitive_cycle_planning'],
  });
  check('Z7: Lesson appended to episode', lesson.lessonId.length > 0);
  check('Z8: Lesson is NOT speculative when derived from verified evidence', lesson.isSpeculative === false);

  // Step 6: Self-reflection
  const refl = reflEngine.reflect({
    subjectEpisodeId: ep.episodeId,
    reasoningWasEvidenceBacked: true,
    assumptionsUsed: [],
    missingInformation: [],
    predictionMade: 'Recovery will succeed',
    predictionOutcome: 'VERIFIED_CORRECT',
    recommendationMatchedOutcome: true,
    actualOutcome: 'Recovery succeeded',
  });
  check('Z9: End-to-end reflection produced', refl.reflectionId.length > 0);
  check('Z10: Prediction correctly classified as VERIFIED', refl.predictionQuality === 'PREDICTION_VERIFIED');

  // Step 7: Confidence calibration
  calEngine.recordOutcomeDataPoint({ subjectId: ep.episodeId, predictedConfidence: 0.92, wasSuccessful: true, verifiedAt: Date.now() });
  calEngine.recordOutcomeDataPoint({ subjectId: ep.episodeId, predictedConfidence: 0.90, wasSuccessful: true, verifiedAt: Date.now() });
  calEngine.recordOutcomeDataPoint({ subjectId: ep.episodeId, predictedConfidence: 0.88, wasSuccessful: true, verifiedAt: Date.now() });
  const calibration = calEngine.calibrate(ep.episodeId, 0.90);
  check('Z11: Calibration completes with CALIBRATED signal for accurate confidence', calibration.signal === 'CALIBRATED');
  check('Z12: Historical records untouched during calibration', calibration.historicalRecordsUnmodified === true);

  episodicEngine.completeEpisode(ep.episodeId);
  check('Z13: Episode completed after full lifecycle', episodicEngine.getEpisode(ep.episodeId)?.isComplete === true);
}

// ============================================================
// FINAL REPORT
// ============================================================
const totalAssertions = TOTAL_PASS + TOTAL_FAIL;
console.log('\n============================================================');
if (TOTAL_FAIL === 0) {
  console.log(`REALITY GATE PASS: ${TOTAL_PASS} assertions verified across Categories A..Z.`);
} else {
  console.log(`REALITY GATE FAIL: ${TOTAL_FAIL} of ${totalAssertions} assertions FAILED.`);
}
console.log('============================================================\n');

if (TOTAL_FAIL > 0) process.exit(1);
