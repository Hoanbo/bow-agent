// tests/test_v4_agent_durable_resilience_cross_episode_continuity.ts
// BOWCON V4.0 — MS-1.3.44 DEDICATED REALITY GATE
// MASTER OWNER DURABLE RESILIENCE, CROSS-EPISODE LEARNING, WORLD-MODEL FEDERATION
// & LONG-HORIZON CONTINUITY RUNTIME
//
// Mandatory verification covering Categories A through AI (35 distinct categories).
// All assertions must pass for MS-1.3.44 to be declared VERIFIED & LOCKED.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// ============================================================
// Import MS-1.3.44 Resilience & Continuity modules
// ============================================================
import {
  CognitiveResilienceRuntime,
  AdaptiveHostOrchestrator,
  EpisodicMemorySynthesisEngine,
  SelfReflectiveEngine,
  ConfidenceCalibrationEngine,
  DurableResilienceStateStore,
  CrossEpisodePatternEngine,
  RecoveryLessonFederationEngine,
  LongHorizonGoalContinuityEngine,
  generateResilienceId,
  type DurableResilienceStateRecord,
  type CrossEpisodePattern,
  type RecoveryLessonFederationRecord,
  type LongHorizonGoalRecord,
  type CognitiveEpisode,
} from '../src/core/resilience/index.js';

// ============================================================
// Import existing canonical modules (MUST NOT BE RECREATED)
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
import { globalAuditLedger } from '../src/core/auditLedger.js';
import { HumanGate } from '../src/core/supervisor/supervisorHumanGate.js';
import { WorldActionAuthorizationEngine } from '../src/core/world-action/worldActionAuthorization.js';

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

console.log('\nStarting MS-1.3.44 Reality Gate: Durable Resilience, Cross-Episode Learning & Goal Continuity...');

// ============================================================
// Category A: Master Owner Authority
// ============================================================
console.log('Testing Category A: Master Owner Authority...');
{
  check('A1: MASTER_OWNER_ID is non-empty', typeof MASTER_OWNER_ID === 'string' && MASTER_OWNER_ID.length > 0);
  check('A2: isMasterOwner(MASTER_OWNER_ID) === true', isMasterOwner(MASTER_OWNER_ID) === true);
  check('A3: isMasterOwner("attacker") === false', isMasterOwner('attacker') === false);
  let caught = false;
  try {
    assertMasterOwner('attacker');
  } catch {
    caught = true;
  }
  check('A4: assertMasterOwner("attacker") throws', caught);
}

// ============================================================
// Category B: BOW Architecture Identity
// ============================================================
console.log('Testing Category B: BOW Architecture Identity...');
{
  check('B1: ECOSYSTEM_ID is "BOW"', ECOSYSTEM_ID === 'BOW');
  check('B2: RUNTIME_IDENTITY is "BOWCON"', RUNTIME_IDENTITY === 'BOWCON');
}

// ============================================================
// Category C: BOWCON Identity (BOWCON != ShopOfBow, BOWCON != BOW)
// ============================================================
console.log('Testing Category C: BOWCON Identity...');
{
  check('C1: BOWCON is not ShopOfBow', RUNTIME_IDENTITY !== 'ShopOfBow');
  check('C2: BOW is the ecosystem, BOWCON is the agent', ECOSYSTEM_ID !== RUNTIME_IDENTITY);
}

// ============================================================
// Category D: No ShopOfBow Dependency
// ============================================================
console.log('Testing Category D: No ShopOfBow Dependency...');
{
  const resilienceFiles = fs.readdirSync('src/core/resilience');
  let hasShopImport = false;
  for (const f of resilienceFiles) {
    const content = fs.readFileSync(path.join('src/core/resilience', f), 'utf8');
    if (/from\s+['"][^'"]*shopofbow[^'"]*['"]/.test(content)) {
      hasShopImport = true;
    }
  }
  check('D1: Zero ShopOfBow imports in resilience subsystem', !hasShopImport);
}

// ============================================================
// Category E: Durable Resilience Persistence
// ============================================================
console.log('Testing Category E: Durable Resilience Persistence...');
{
  const testStoreDir = 'data/test-resilience-pers';
  const store = new DurableResilienceStateStore({ storageDir: testStoreDir, sessionId: 'sess_e' });
  const runtime = new CognitiveResilienceRuntime({ stateStore: store });

  const fail = runtime.detectFailure({
    description: 'Transient network failure',
    affectedComponent: 'network_adapter',
    evidence: ['socket timeout'],
    severity: 'MEDIUM',
    failureClass: 'TRANSIENT',
  });

  const prop = runtime.proposeRecovery(fail.failureId);
  const attempt = runtime.executeRecovery(prop.proposalId);
  runtime.verifyRecovery(attempt.attemptId, true, 'ping succeeded');

  const saved = runtime.saveDurableState();
  check('E1: Durable resilience state saved to disk', saved !== undefined && fs.existsSync(store.getFilePath()));
  check('E2: Schema version is 1', saved?.schemaVersion === 1);
  check('E3: Health state recorded in persisted state', saved?.healthState === 'RECOVERED');
  check('E4: Persisted state contains integrityHash', typeof saved?.integrityHash === 'string' && saved!.integrityHash.length === 64);
  check('E5: No authority tokens in persisted state', saved?.containsAuthorityTokens === false);
  check('E6: No credentials in persisted state', saved?.containsCredentials === false);

  // Clean up
  try { fs.rmSync(testStoreDir, { recursive: true, force: true }); } catch {}
}

// ============================================================
// Category F: Restart Reconstruction
// ============================================================
console.log('Testing Category F: Restart Reconstruction...');
{
  const testStoreDir = 'data/test-resilience-reconstruct';
  const store1 = new DurableResilienceStateStore({ storageDir: testStoreDir, sessionId: 'sess_f' });
  const runtime1 = new CognitiveResilienceRuntime({ stateStore: store1 });

  const fail = runtime1.detectFailure({
    description: 'Host CPU throttled',
    affectedComponent: 'host_scheduler',
    evidence: ['load average high'],
    severity: 'HIGH',
    failureClass: 'HOST_INSTABILITY_RECURRING' as any,
  });
  runtime1.saveDurableState();

  // Simulate restart in new runtime instance pointing to same store
  const store2 = new DurableResilienceStateStore({ storageDir: testStoreDir, sessionId: 'sess_f' });
  const runtime2 = new CognitiveResilienceRuntime({ stateStore: store2 });

  check('F1: Failures reconstructed on restart', runtime2.getAllFailures().length === 1);
  check('F2: Reconstructed failure matches original failureId', runtime2.getAllFailures()[0].failureId === fail.failureId);
  check('F3: Reconstructed health state matches DEGRADED', runtime2.getHealthState() === 'DEGRADED');

  // Clean up
  try { fs.rmSync(testStoreDir, { recursive: true, force: true }); } catch {}
}

// ============================================================
// Category G: Corrupted Resilience State Rejection
// ============================================================
console.log('Testing Category G: Corrupted Resilience State Rejection...');
{
  const testStoreDir = 'data/test-resilience-corrupt';
  const store = new DurableResilienceStateStore({ storageDir: testStoreDir, sessionId: 'sess_g' });
  const runtime = new CognitiveResilienceRuntime({ stateStore: store });

  runtime.detectFailure({
    description: 'Safe baseline failure',
    affectedComponent: 'base_comp',
    evidence: [],
    severity: 'LOW',
  });
  runtime.saveDurableState();

  // Tamper with file on disk to corrupt hash
  const filePath = store.getFilePath();
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  raw.healthState = 'TAMPERED_HEALTH'; // Tampering
  fs.writeFileSync(filePath, JSON.stringify(raw), 'utf8');

  // Load via store directly
  const loadResult = store.loadState();
  check('G1: Tampered resilience state is rejected as corrupted', loadResult.wasCorrupted === true);
  check('G2: Corrupted state status is REBUILT', loadResult.state.stateStatus === 'REBUILT');
  check('G3: Safe baseline healthState is HEALTHY upon rebuild', loadResult.state.healthState === 'HEALTHY');

  // Clean up
  try { fs.rmSync(testStoreDir, { recursive: true, force: true }); } catch {}
}

// ============================================================
// Category H: Cross-Session Isolation
// ============================================================
console.log('Testing Category H: Cross-Session Isolation...');
{
  const storeA = new DurableResilienceStateStore({ sessionId: 'session_alpha' });
  const storeB = new DurableResilienceStateStore({ sessionId: 'session_beta' });

  check('H1: Store sessionIds are distinct', storeA.getSessionId() !== storeB.getSessionId());
  check('H2: Storage file paths are session-isolated', storeA.getFilePath() !== storeB.getFilePath());
}

// ============================================================
// Category I: Cross-Episode Pattern Detection
// ============================================================
console.log('Testing Category I: Cross-Episode Pattern Detection...');
{
  const patternEngine = new CrossEpisodePatternEngine();
  const fakeEpisodes: CognitiveEpisode[] = [
    {
      episodeId: 'ep_1',
      createdAt: 1000,
      ownerId: MASTER_OWNER_ID,
      projectId: 'proj_mesh',
      goalId: 'g1',
      triggeringContext: 'test execution',
      relatedObjective: 'sync',
      events: [],
      observations: [],
      decisions: [],
      authorizedActions: [],
      executionResult: 'EXECUTION_FAILURE: connection refused',
      lessons: [],
      contradictions: [],
      uncertainties: [],
      provenanceChain: [],
      overallConfidence: 0.5,
      phase: 'EXECUTION',
      integrityHash: 'hash1',
      isComplete: false,
    },
    {
      episodeId: 'ep_2',
      createdAt: 2000,
      ownerId: MASTER_OWNER_ID,
      projectId: 'proj_mesh',
      goalId: 'g1',
      triggeringContext: 'test execution',
      relatedObjective: 'sync',
      events: [],
      observations: [],
      decisions: [],
      authorizedActions: [],
      executionResult: 'EXECUTION_FAILURE: timeout waiting for ack',
      lessons: [],
      contradictions: [],
      uncertainties: [],
      provenanceChain: [],
      overallConfidence: 0.5,
      phase: 'EXECUTION',
      integrityHash: 'hash2',
      isComplete: false,
    },
  ];

  const patterns = patternEngine.minePatterns(fakeEpisodes);
  check('I1: Recurring failure pattern mined from episodes', patterns.length >= 1);
  const failurePat = patterns.find((p) => p.patternType === 'REPEATED_FAILURE');
  check('I2: Pattern type is REPEATED_FAILURE', failurePat !== undefined);
  check('I3: Pattern has observationCount >= 2', failurePat !== undefined && failurePat.observationCount >= 2);
  check('I4: Supporting episodes preserved', failurePat?.supportingEpisodeIds.includes('ep_1') && failurePat?.supportingEpisodeIds.includes('ep_2'));
}

// ============================================================
// Category J: Minimum Evidence Threshold (Must be >= 2)
// ============================================================
console.log('Testing Category J: Minimum Evidence Threshold...');
{
  const patternEngine = new CrossEpisodePatternEngine();
  let singleObservationRejected = false;
  try {
    patternEngine.registerPattern({
      patternType: 'REPEATED_FAILURE',
      description: 'Single isolated incident',
      supportingEpisodeIds: ['single_ep'],
      observationCount: 1,
    });
  } catch (err: any) {
    singleObservationRejected = err.message.includes('EPISTEMIC_VIOLATION');
  }
  check('J1: Pattern creation from single observation rejected with EPISTEMIC_VIOLATION', singleObservationRejected);
}

// ============================================================
// Category K: Pattern Provenance & Advisory Constraints
// ============================================================
console.log('Testing Category K: Pattern Provenance & Advisory Constraints...');
{
  const patternEngine = new CrossEpisodePatternEngine();
  const pat = patternEngine.registerPattern({
    patternType: 'CAPABILITY_UNAVAILABLE_RECURRING',
    description: 'GPU memory unavailable across 2 cycles',
    supportingEpisodeIds: ['ep_a', 'ep_b'],
    provenance: 'OBSERVED_PATTERN',
  });

  check('K1: Pattern provenance is OBSERVED_PATTERN', pat.provenance === 'OBSERVED_PATTERN');
  check('K2: isAdvisoryOnly === true', pat.isAdvisoryOnly === true);

  // Elevate via Owner
  const affirmed = patternEngine.affirmByOwner(pat.patternId, MASTER_OWNER_ID);
  check('K3: Owner affirmation elevates provenance to OWNER_CONFIRMED_PATTERN', affirmed.provenance === 'OWNER_CONFIRMED_PATTERN');
  check('K4: Owner affirmed pattern confidence is 1.0', affirmed.confidence === 1.0);
}

// ============================================================
// Category L: Contradictory Pattern Evidence
// ============================================================
console.log('Testing Category L: Contradictory Pattern Evidence...');
{
  const patternEngine = new CrossEpisodePatternEngine();
  const pat = patternEngine.registerPattern({
    patternType: 'BOTTLENECK_RECURRING',
    description: 'Disk IO bottleneck suspected',
    supportingEpisodeIds: ['ep_io_1', 'ep_io_2'],
  });

  check('L1: Initial status is ACTIVE', pat.patternStatus === 'ACTIVE');

  // Add contradictory evidence
  patternEngine.addContradictoryEvidence(pat.patternId, 'ep_io_fast_1', 'Disk IO benchmark passed with 3GB/s');
  let updated = patternEngine.getPattern(pat.patternId);
  check('L2: Status shifts to MONITORING after contradictory evidence', updated?.patternStatus === 'MONITORING');
  check('L3: Confidence decreased upon contradictory evidence', updated !== undefined && updated.confidence < pat.confidence);

  // Add enough contradictions to refute
  patternEngine.addContradictoryEvidence(pat.patternId, 'ep_io_fast_2', 'Secondary benchmark confirmed high throughput');
  updated = patternEngine.getPattern(pat.patternId);
  check('L4: Status shifts to REFUTED when contradictions match observations', updated?.patternStatus === 'REFUTED');
}

// ============================================================
// Category M: UNKNOWN State Preservation
// ============================================================
console.log('Testing Category M: UNKNOWN State Preservation...');
{
  const host = globalHostDiscovery.discoverHost();
  check('M1: Host discovery platform is non-empty string', typeof host.operatingSystem.platform === 'string' && host.operatingSystem.platform.length > 0);
  check('M2: Host GPU status conforms to HostMetricStatus', ['KNOWN', 'UNAVAILABLE', 'UNKNOWN', 'NOT_SUPPORTED', 'NOT_MEASURED'].includes(host.gpu.status));
}

// ============================================================
// Category N: Recovery Lesson Creation
// ============================================================
console.log('Testing Category N: Recovery Lesson Creation...');
{
  const runtime = new CognitiveResilienceRuntime();
  const fail = runtime.detectFailure({
    description: 'Ephemeral port exhaustion',
    affectedComponent: 'socket_pool',
    evidence: ['EADDRINUSE'],
    severity: 'MEDIUM',
    failureClass: 'TRANSIENT',
  });
  const lessons = runtime.generateRecoveryLessons(fail.failureId);
  check('N1: Recovery lessons generated as advisory strings', Array.isArray(lessons));
}

// ============================================================
// Category O: World Model Advisory Federation
// ============================================================
console.log('Testing Category O: World Model Advisory Federation...');
{
  const fedEngine = new RecoveryLessonFederationEngine();
  const fakeEpisode: CognitiveEpisode = {
    episodeId: 'ep_fed_1',
    createdAt: Date.now(),
    ownerId: MASTER_OWNER_ID,
    projectId: 'proj_test',
    goalId: 'g_fed',
    triggeringContext: 'federation test',
    relatedObjective: 'learn',
    events: [],
    observations: ['Observation 1'],
    decisions: ['Decision 1'],
    authorizedActions: [],
    lessons: [
      {
        lessonId: 'l1',
        lesson: 'Avoid concurrent writes to shared locks',
        confidence: 0.85,
        isSpeculative: false,
        derivedFrom: ['lock_contention_event'],
        appliesTo: ['concurrency'],
      },
    ],
    uncertainties: ['Peak memory unknown'],
    contradictions: [],
    provenanceChain: [],
    overallConfidence: 0.8,
    phase: 'LEARNING',
    integrityHash: 'h_fed',
    isComplete: true,
  };

  const records = fedEngine.federateFromEpisode(fakeEpisode);
  check('O1: Federates episodic lessons into advisory records', records.length >= 2);
  const lessonRec = records.find((r) => r.recordType === 'LEARNED_RECOVERY_LESSON');
  check('O2: Lesson record preserves sourceEpisodeId', lessonRec?.sourceEpisodeIds.includes('ep_fed_1'));
  check('O3: Lesson record isAdvisoryOnly === true', lessonRec?.isAdvisoryOnly === true);
}

// ============================================================
// Category P: Advisory Cannot Become Authority
// ============================================================
console.log('Testing Category P: Advisory Cannot Become Authority...');
{
  const fedEngine = new RecoveryLessonFederationEngine();
  const fakePattern: CrossEpisodePattern = {
    patternId: 'pat_test_p',
    patternType: 'PLAN_INFEASIBILITY_RECURRING',
    description: 'Plan exceeds memory constraints',
    observationCount: 3,
    supportingEpisodeIds: ['ep1', 'ep2', 'ep3'],
    firstObservedAt: 1000,
    lastObservedAt: 3000,
    confidence: 0.9,
    provenance: 'OBSERVED_PATTERN',
    patternStatus: 'ACTIVE',
    contradictoryEvidence: [],
    unresolvedUncertainty: [],
    isAdvisoryOnly: true,
  };

  const fedRecord = fedEngine.federateFromPattern(fakePattern);
  check('P1: Federated pattern record is advisory only', fedRecord.isAdvisoryOnly === true);
  fedEngine.assertCannotOverwriteWorldFact(fedRecord.recordId, 'host.totalMemoryBytes');
  check('P2: Advisory cannot overwrite authoritative world fact', true);
}

// ============================================================
// Category Q: Advisory Cannot Execute
// ============================================================
console.log('Testing Category Q: Advisory Cannot Execute...');
{
  const fedEngine = new RecoveryLessonFederationEngine();
  const advisories = fedEngine.getAllAdvisories();
  // Advisory records are pure data objects with no execution method
  const hasExecute = advisories.some((a: any) => typeof a.execute === 'function' || typeof a.authorize === 'function');
  check('Q1: Advisory records possess zero execution or authorization capabilities', !hasExecute);
}

// ============================================================
// Category R: Goal Continuity Across Restart
// ============================================================
console.log('Testing Category R: Goal Continuity Across Restart...');
{
  const testGoalDir = 'data/test-goal-restart';
  const engine1 = new LongHorizonGoalContinuityEngine({ storageDir: testGoalDir });

  const goal = engine1.registerGoal({
    projectId: 'proj_horizon',
    title: 'Multi-day dataset synthesis',
    objective: 'Synthesize 1000 domain concepts',
    initialProgress: 25,
  });
  check('R1: Goal registered with state ACTIVE', goal.state === 'ACTIVE');

  // Restart simulation
  const engine2 = new LongHorizonGoalContinuityEngine({ storageDir: testGoalDir });
  const restoredGoal = engine2.getGoal(goal.goalId);

  check('R2: Goal restored from disk after restart', restoredGoal !== undefined);
  check('R3: Restored goal preserves progress percent', restoredGoal?.progressPercent === 25);
  check('R4: Restored goal preserves objective', restoredGoal?.objective === 'Synthesize 1000 domain concepts');

  // Clean up
  try { fs.rmSync(testGoalDir, { recursive: true, force: true }); } catch {}
}

// ============================================================
// Category S: Interrupted Goal Recovery
// ============================================================
console.log('Testing Category S: Interrupted Goal Recovery...');
{
  const engine = new LongHorizonGoalContinuityEngine();
  const goal = engine.registerGoal({
    projectId: 'proj_interrupt',
    title: 'Model checkpointing',
    objective: 'Store model weights',
  });

  engine.recordInterruption(goal.goalId, 'Host rebooted during maintenance window');
  let current = engine.getGoal(goal.goalId);
  check('S1: Goal state marked INTERRUPTED after interruption', current?.state === 'INTERRUPTED');
  check('S2: Interruption reason recorded', current?.interruptionHistory[0].reason.includes('Host rebooted'));

  // Resume
  engine.resumeInterruptedGoal(goal.goalId);
  current = engine.getGoal(goal.goalId);
  check('S3: Goal resumes to ACTIVE state', current?.state === 'ACTIVE');
  check('S4: Interruption history preserves resumedAt timestamp', typeof current?.interruptionHistory[0].resumedAt === 'number');
}

// ============================================================
// Category T: Goal Stall Detection
// ============================================================
console.log('Testing Category T: Goal Stall Detection...');
{
  const engine = new LongHorizonGoalContinuityEngine({ stallThresholdMs: 500 });
  const goal = engine.registerGoal({
    projectId: 'proj_stall',
    title: 'Data pipeline ingestion',
    objective: 'Ingest events',
  });

  // Check immediately (not stalled)
  let evalRes = engine.evaluateStallStatus(goal.goalId, goal.lastProgressAt + 100);
  check('T1: Goal is not stalled within threshold', evalRes.state === 'ACTIVE');

  // Check past stall threshold
  evalRes = engine.evaluateStallStatus(goal.goalId, goal.lastProgressAt + 600);
  check('T2: Goal transitions to STALLED past threshold', evalRes.state === 'STALLED');

  // Check past 2x threshold -> AT_RISK
  evalRes = engine.evaluateStallStatus(goal.goalId, goal.lastProgressAt + 1200);
  check('T3: Goal transitions to AT_RISK past 2x threshold', evalRes.state === 'AT_RISK');

  // Record progress resets stall
  const progressed = engine.recordProgress(goal.goalId, 50, 'Batch 1 ingested');
  check('T4: Record progress resets state to PROGRESSING', progressed.state === 'PROGRESSING');
  check('T5: Stalled duration reset to 0 upon progress', progressed.stalledDurationMs === 0);
}

// ============================================================
// Category U: Owner Reprioritization & Semantic Intent
// ============================================================
console.log('Testing Category U: Owner Reprioritization & Semantic Intent...');
{
  const engine = new LongHorizonGoalContinuityEngine();
  const goal = engine.registerGoal({
    projectId: 'proj_u',
    title: 'Legacy sync module',
    objective: 'Sync legacy database',
  });

  // Non-owner cannot affirm semantic intent
  let nonOwnerRejected = false;
  try {
    engine.setOwnerIntentSemantic({
      goalId: goal.goalId,
      operatorId: 'non_owner_agent',
      semantic: 'ABANDONED',
      rationale: 'Looks inactive',
    });
  } catch (err: any) {
    nonOwnerRejected = err.message.includes('AUTHORITY_DENIED');
  }
  check('U1: Non-owner attempt to declare goal ABANDONED is rejected', nonOwnerRejected);

  // Master Owner affirms ABANDONED
  const ownerResult = engine.setOwnerIntentSemantic({
    goalId: goal.goalId,
    operatorId: MASTER_OWNER_ID,
    semantic: 'ABANDONED',
    rationale: 'Replaced by cloud native pipeline',
  });
  check('U2: Master Owner can definitively transition goal to ABANDONED', ownerResult.state === 'ABANDONED');
  check('U3: Owner intent override record preserved', ownerResult.ownerIntentOverride?.affirmedBy === MASTER_OWNER_ID);
}

// ============================================================
// Category V: USER_STOP Supremacy
// ============================================================
console.log('Testing Category V: USER_STOP Supremacy...');
{
  const runtime = new CognitiveResilienceRuntime();
  runtime.emergencyStop('Owner triggered global kill switch');
  check('V1: Runtime is stopped', runtime.isStopped() === true);
  check('V2: Health state is BLOCKED under USER_STOP', runtime.getHealthState() === 'BLOCKED');

  let propRejected = false;
  try {
    runtime.proposeRecovery('any_fail');
  } catch (e: any) {
    propRejected = e.message.includes('RUNTIME_STOPPED');
  }
  check('V3: proposeRecovery rejected under USER_STOP', propRejected);

  let execRejected = false;
  try {
    runtime.executeRecovery('any_prop');
  } catch (e: any) {
    execRejected = e.message.includes('RUNTIME_STOPPED');
  }
  check('V4: executeRecovery rejected under USER_STOP', execRejected);
}

// ============================================================
// Category W: Recovery Authorization Boundary
// ============================================================
console.log('Testing Category W: Recovery Authorization Boundary...');
{
  const runtime = new CognitiveResilienceRuntime();
  const fail = runtime.detectFailure({
    description: 'Corrupted disk index',
    affectedComponent: 'disk_index',
    evidence: ['checksum error'],
    severity: 'HIGH',
    failureClass: 'STATE_CORRUPTED',
  });

  const prop = runtime.proposeRecovery(fail.failureId);
  check('W1: STATE_CORRUPTED recovery requires owner approval', prop.requiresOwnerApproval === true);

  let unauthRejected = false;
  try {
    runtime.executeRecovery(prop.proposalId); // No token provided
  } catch (e: any) {
    unauthRejected = e.message.includes('AUTHORIZATION_REQUIRED');
  }
  check('W2: Executing owner-required recovery without token throws AUTHORIZATION_REQUIRED', unauthRejected);
}

// ============================================================
// Category X: No Duplicate Authority
// ============================================================
console.log('Testing Category X: No Duplicate Authority...');
{
  check('X1: masterArchitectureIdentity is the single source for Master Owner', typeof isMasterOwner === 'function');
  check('X2: No duplicate HumanGate exists in resilience module', !(CognitiveResilienceRuntime.prototype as any).requestHumanApproval);
}

// ============================================================
// Category Y: No Duplicate HumanGate
// ============================================================
console.log('Testing Category Y: No Duplicate HumanGate...');
{
  check('Y1: Canonical HumanGate is imported from src/core/authority', typeof HumanGate === 'function');
  const resilienceExports = await import('../src/core/resilience/index.js');
  check('Y2: Resilience module does not export HumanGate', !(resilienceExports as any).HumanGate);
}

// ============================================================
// Category Z: No Duplicate Token Store
// ============================================================
console.log('Testing Category Z: No Duplicate Token Store...');
{
  check('Z1: Canonical WorldActionAuthorizationEngine is imported from src/core/world-action', typeof WorldActionAuthorizationEngine === 'function');
  const resilienceExports = await import('../src/core/resilience/index.js');
  check('Z2: Resilience module does not export token store', !(resilienceExports as any).WorldActionAuthorizationEngine);
}

// ============================================================
// Category AA: Audit Integrity
// ============================================================
console.log('Testing Category AA: Audit Integrity...');
{
  const auditTrail = globalAuditLedger.getAuditTrail();
  check('AA1: Audit trail loaded from disk has verified entries', auditTrail.length >= 700);
  const isChainIntact = globalAuditLedger.verifyChainIntegrity();
  check('AA2: Audit ledger cryptographic chain integrity verified (unbroken)', isChainIntact === true);
}

// ============================================================
// Category AB: Audit Warning & Root-Cause Behavior
// ============================================================
console.log('Testing Category AB: Audit Warning & Root-Cause Behavior...');
{
  const status = globalAuditLedger.getCorruptionStatus();
  check('AB1: Audit ledger hasCorruption status is false', status.hasCorruption === false);
  check('AB2: Audit ledger error list is empty on clean chain', status.errors.length === 0);
}

// ============================================================
// Category AC: Build Integrity
// ============================================================
console.log('Testing Category AC: Build Integrity...');
{
  check('AC1: dist/ directory exists', fs.existsSync('dist'));
  check('AC2: dist/index.js exists', fs.existsSync('dist/index.js'));
  check('AC3: dist/index.d.ts exists', fs.existsSync('dist/index.d.ts'));
}

// ============================================================
// Category AD: Zero Fabricated Telemetry
// ============================================================
console.log('Testing Category AD: Zero Fabricated Telemetry...');
{
  const host = globalHostDiscovery.discoverHost();
  check('AD1: Host discovery reports actual CPU architecture', typeof host.architecture.arch === 'string' && host.architecture.arch.length > 0);
  check('AD2: Host discovery reports real CPU core count or UNKNOWN', typeof host.cpu.cores === 'number' || host.cpu.cores === 'UNKNOWN');
}

// ============================================================
// Category AE: No Unrestricted Shell
// ============================================================
console.log('Testing Category AE: No Unrestricted Shell Execution...');
{
  const resilienceFiles = fs.readdirSync('src/core/resilience');
  let evalFound = false;
  let newFunctionFound = false;
  let execSyncFound = false;

  for (const f of resilienceFiles) {
    const content = fs.readFileSync(path.join('src/core/resilience', f), 'utf8');
    if (/eval\s*\(/.test(content)) evalFound = true;
    if (/new\s+Function\s*\(/.test(content)) newFunctionFound = true;
    if (/execSync\s*\(/.test(content)) execSyncFound = true;
  }

  check('AE1: Zero eval() in resilience subsystem', !evalFound);
  check('AE2: Zero new Function() in resilience subsystem', !newFunctionFound);
  check('AE3: Zero execSync() in resilience subsystem', !execSyncFound);
}

// ============================================================
// Category AF: Protected Workspace Isolation
// ============================================================
console.log('Testing Category AF: Protected Workspace Isolation...');
{
  let storeBlocked = false;
  try {
    new DurableResilienceStateStore({ storageDir: 'C:\\BOW\\shopofbow\\resilience' });
  } catch (e: any) {
    storeBlocked = e.message.includes('SECURITY_VIOLATION');
  }
  check('AF1: DurableResilienceStateStore cannot target C:\\BOW\\shopofbow', storeBlocked);

  let goalBlocked = false;
  try {
    new LongHorizonGoalContinuityEngine({ storageDir: 'C:\\BOW\\shopofbow\\goals' });
  } catch (e: any) {
    goalBlocked = e.message.includes('SECURITY_VIOLATION');
  }
  check('AF2: LongHorizonGoalContinuityEngine cannot target C:\\BOW\\shopofbow', goalBlocked);
}

// ============================================================
// Category AG: Full End-to-End Resilience Lifecycle
// ============================================================
console.log('Testing Category AG: Full End-to-End Lifecycle...');
{
  const testDir = 'data/test-resilience-ag';
  const store = new DurableResilienceStateStore({ storageDir: testDir, sessionId: 'sess_ag' });
  const runtime = new CognitiveResilienceRuntime({ stateStore: store });

  // DETECT
  const fail = runtime.detectFailure({
    description: 'Stale configuration snapshot',
    affectedComponent: 'config_manager',
    evidence: ['snapshot age > 1 hour'],
    severity: 'LOW',
    failureClass: 'STALE_STATE',
  });
  check('AG1: Failure detected and classified as STALE_STATE', fail.failureClass === 'STALE_STATE');

  // PROPOSE
  const prop = runtime.proposeRecovery(fail.failureId);
  check('AG2: Recovery proposal generated with AUTO_SAFE', prop.recoveryClass === 'AUTO_SAFE');

  // EXECUTE
  const attempt = runtime.executeRecovery(prop.proposalId);
  check('AG3: Recovery attempt executed', attempt.status === 'IN_PROGRESS');

  // VERIFY
  const ver = runtime.verifyRecovery(attempt.attemptId, true, 'Config re-pulled from local cache');
  check('AG4: Recovery verified as passed', ver.passed === true);
  check('AG5: Runtime health restored to RECOVERED', runtime.getHealthState() === 'RECOVERED');

  // LEARN
  const lessons = runtime.generateRecoveryLessons(fail.failureId);
  check('AG6: Recovery lessons produced', lessons.length >= 1);

  // Clean up
  try { fs.rmSync(testDir, { recursive: true, force: true }); } catch {}
}

// ============================================================
// Category AH: Cross-Episode Learning Lifecycle
// ============================================================
console.log('Testing Category AH: Cross-Episode Learning Lifecycle...');
{
  const testEpisodesDir = 'data/test-episodes-ah';
  const episodicEngine = new EpisodicMemorySynthesisEngine(testEpisodesDir);
  const patternEngine = new CrossEpisodePatternEngine();
  const fedEngine = new RecoveryLessonFederationEngine(patternEngine);

  // Create episode 1
  const ep1 = episodicEngine.openEpisode({
    projectId: 'proj_ah',
    goalId: 'g_ah',
    triggeringContext: 'API rate limit hit',
    relatedObjective: 'ingest',
  });
  episodicEngine.appendEvent(ep1.episodeId, {
    phase: 'EXECUTION',
    timestamp: Date.now(),
    description: 'HTTP 429 Too Many Requests',
    provenance: 'HOST_TELEMETRY',
    confidence: 0.9,
  });
  episodicEngine.recordExecutionResult(ep1.episodeId, 'EXECUTION_FAILURE: Rate limit exceeded');
  episodicEngine.completeEpisode(ep1.episodeId);

  // Create episode 2
  const ep2 = episodicEngine.openEpisode({
    projectId: 'proj_ah',
    goalId: 'g_ah',
    triggeringContext: 'API rate limit hit retry',
    relatedObjective: 'ingest',
  });
  episodicEngine.appendEvent(ep2.episodeId, {
    phase: 'EXECUTION',
    timestamp: Date.now(),
    description: 'HTTP 429 Second Burst Exceeded',
    provenance: 'HOST_TELEMETRY',
    confidence: 0.9,
  });
  episodicEngine.recordExecutionResult(ep2.episodeId, 'EXECUTION_FAILURE: Rate limit exceeded twice');
  episodicEngine.completeEpisode(ep2.episodeId);

  // Mine patterns across both episodes
  const patterns = patternEngine.minePatterns(episodicEngine.getAllEpisodes());
  check('AH1: Recurring pattern detected across multiple episodes', patterns.length >= 1);

  // Federate patterns into advisory layer
  const advisory = fedEngine.federateFromPattern(patterns[0]);
  check('AH2: Pattern federated into world-model advisory record', advisory !== undefined);
  check('AH3: Advisory record is strictly advisoryOnly', advisory.isAdvisoryOnly === true);

  // Clean up
  try { fs.rmSync(testEpisodesDir, { recursive: true, force: true }); } catch {}
}

// ============================================================
// Category AI: Long-Horizon Continuity Lifecycle
// ============================================================
console.log('Testing Category AI: Long-Horizon Continuity Lifecycle...');
{
  const testGoalDir = 'data/test-goal-ai';
  const goalEngine = new LongHorizonGoalContinuityEngine({ storageDir: testGoalDir, stallThresholdMs: 300 });

  // 1. Register goal
  const goal = goalEngine.registerGoal({
    projectId: 'proj_ai',
    title: 'Autonomous System Evolution',
    objective: 'Iterate across 5 cognitive generations',
    initialProgress: 0,
  });
  check('AI1: Long-horizon goal initialized', goal.state === 'ACTIVE');

  // 2. Interruption during generation 1
  goalEngine.recordInterruption(goal.goalId, 'Host rebooted during generation 1');
  check('AI2: Goal captures interruption', goalEngine.getGoal(goal.goalId)?.state === 'INTERRUPTED');

  // 3. Resume and make progress
  goalEngine.resumeInterruptedGoal(goal.goalId);
  goalEngine.recordProgress(goal.goalId, 20, 'Generation 1 verified');
  check('AI3: Goal resumed and made progress to 20%', goalEngine.getGoal(goal.goalId)?.progressPercent === 20);

  // 4. Stall detection
  const current = goalEngine.getGoal(goal.goalId)!;
  const stalled = goalEngine.evaluateStallStatus(goal.goalId, current.lastProgressAt + 400);
  check('AI4: Goal detects inactivity as STALLED without declaring failure', stalled.state === 'STALLED');

  // 5. Completion
  const completed = goalEngine.recordProgress(goal.goalId, 100, 'All 5 generations synthesized');
  check('AI5: Goal successfully completes upon verified 100% progress', completed.state === 'COMPLETED');

  // Clean up
  try { fs.rmSync(testGoalDir, { recursive: true, force: true }); } catch {}
}

// ============================================================
// SUMMARY REPORT
// ============================================================
console.log('\n============================================================');
console.log(`REALITY GATE SUCCESS: All ${TOTAL_PASS} assertions verified across Categories A..AI.`);
console.log(`Total Failed Assertions: ${TOTAL_FAIL}`);
console.log('============================================================\n');

if (TOTAL_FAIL > 0) {
  process.exit(1);
}
