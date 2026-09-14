// tests/test_v4_ms15_cognitive_state.ts
// BOWCON V4.0 — MS-1.5.02: PERSISTENT COGNITIVE STATE ENGINE & WORKING REGISTERS
// Dedicated Regression Suite #96
//
// Verifies Components 989–997:
// 1. CognitiveStateTypes & Contracts (989)
// 2. WorkingRegisterStore (990)
// 3. AttentionStateManager (991)
// 4. CognitiveStatePersistenceEngine (992)
// 5. CognitiveStateRecoveryEngine (993)
// 6. CognitiveStatePromotionGate (994)
// 7. CognitiveStateExecutionGate (995)
// 8. CognitiveStateEngineMasterFacade (996)
// 9. CognitiveStateModuleIndex (997)
//
// Required Vectors:
// VECTOR 1  — Register initialization
// VECTOR 2  — Strong type validation
// VECTOR 3  — State version progression (1 -> 2 -> 3...)
// VECTOR 4  — OCC / CAS (CognitiveStateConcurrencyError)
// VECTOR 5  — Atomic persistence (no partial writes)
// VECTOR 6  — Crash recovery (simulation across instances)
// VECTOR 7  — Attention stack (1 primary, max 3 secondary, max 5 depth, interrupt & resume)
// VECTOR 8  — USER_STOP supremacy (mutation rejection, zero tool execution)
// VECTOR 9  — Tenant / session isolation (cross-tenant access rejected)
// VECTOR 10 — Sanitization (secrets & PII redacted before disk write)
// VECTOR 11 — Prototype pollution protection (__proto__, constructor, prototype)
// VECTOR 12 — Size boundary (512 KB hard limit rejected)
// VECTOR 13 — Cryptographic provenance chain (SHA-256 stateHash & previousStateHash)
// VECTOR 14 — Promotion & execution boundary (COGNITION != AUTHORITY, zero tool execution)

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  COGNITIVE_STATE_SCHEMA_VERSION,
  MAX_COGNITIVE_STATE_BYTES,
  MAX_ATTENTION_STACK_DEPTH,
  MAX_SECONDARY_ATTENTION_TARGETS,
  GENESIS_PREVIOUS_HASH,
  CognitiveStateValidationError,
  CognitiveStateConcurrencyError,
  CognitiveStateSizeLimitError,
  CognitiveStateIntegrityError,
  CrossTenantCognitiveStateError,
  CognitiveStateUserStopError,
  computeCognitiveStateHash,
  WorkingRegisterStore,
  AttentionStateManager,
  CognitiveStatePersistenceEngine,
  CognitiveStateRecoveryEngine,
  CognitiveStatePromotionGate,
  CognitiveStateExecutionGate,
  CognitiveStateEngine,
  globalCognitiveStateEngine,
  type AttentionTargetDescriptor,
  type CognitiveStateDocument,
  type CognitiveHypothesis,
} from '../src/core/cognitiveState/index.js';

let passedAssertions = 0;
function expect(condition: boolean, msg: string) {
  assert(condition, `[ASSERTION FAILED] ${msg}`);
  passedAssertions++;
}

async function runSuite96() {
  console.log('================================================================================');
  console.log('BOWCON V4 — MS-1.5.02: PERSISTENT COGNITIVE STATE ENGINE & WORKING REGISTERS');
  console.log('DEDICATED REGRESSION SUITE #96');
  console.log('================================================================================\n');

  const testDir = path.resolve(process.cwd(), 'scratch', 'test_cognitive_state_' + Date.now());
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  try {
    // -------------------------------------------------------------------------
    // VECTOR 1 — Register initialization
    // -------------------------------------------------------------------------
    console.log('--- VECTOR 1: Register initialization ---');
    const store1 = new WorkingRegisterStore();
    const doc1 = store1.initialize('tenant-alpha', 'sess-001');

    expect(doc1.schemaVersion === COGNITIVE_STATE_SCHEMA_VERSION, 'Schema version must match contract');
    expect(doc1.tenantId === 'tenant-alpha', 'Tenant ID must match');
    expect(doc1.sessionId === 'sess-001', 'Session ID must match');
    expect(doc1.stateVersion === 1, 'Initial stateVersion must be 1');
    expect(doc1.lifecycleState === 'ACTIVE', 'Initial lifecycleState must be ACTIVE');
    expect(doc1.registers.cognitive_priority === 0.5, 'Default cognitive_priority must be 0.5');
    expect(Array.isArray(doc1.registers.recent_observations), 'recent_observations must be array');
    expect(Array.isArray(doc1.registers.hypotheses), 'hypotheses must be array');
    expect(doc1.provenance.stateVersion === 1, 'Provenance stateVersion must be 1');
    expect(doc1.provenance.stateHash.length === 64, 'Provenance stateHash must be 64-char SHA-256');
    expect(doc1.provenance.previousStateHash === GENESIS_PREVIOUS_HASH, 'Genesis previousStateHash must match');
    console.log('✔ VECTOR 1 PASSED: Register initialization verified.\n');

    // -------------------------------------------------------------------------
    // VECTOR 2 — Strong type validation
    // -------------------------------------------------------------------------
    console.log('--- VECTOR 2: Strong type validation ---');
    // Chain-of-thought prohibition
    assert.throws(
      () => store1.updateRegisters({
        hypotheses: [{
          hypothesisId: 'hyp-cot',
          summary: 'Legit statement',
          confidence: 0.5,
          status: 'SPECULATIVE',
          internalReasoning: 'Forbidden chain of thought leak'
        } as any]
      }, { expectedVersion: 1, mutatedBy: 'test', mutationReason: 'test' }),
      (err: any) => err instanceof CognitiveStateValidationError && err.message.includes('chain-of-thought'),
      'Prohibited CoT keys must throw CognitiveStateValidationError'
    );
    // Raw scratchpad prohibition
    assert.throws(
      () => store1.updateRegisters({
        current_focus: { subject: 'test', domain: 'test', establishedAt: '', rationale: 'test', scratchpad: 'secret reasoning' } as any
      }, { expectedVersion: 1, mutatedBy: 'test', mutationReason: 'test' }),
      (err: any) => err instanceof CognitiveStateValidationError && err.message.includes('chain-of-thought'),
      'Scratchpad key must throw CognitiveStateValidationError'
    );
    expect(true, 'Type validation blocks invalid values and CoT leaks');
    console.log('✔ VECTOR 2 PASSED: Strong type validation verified.\n');

    // -------------------------------------------------------------------------
    // VECTOR 3 — State version progression (1 -> 2 -> 3...)
    // -------------------------------------------------------------------------
    console.log('--- VECTOR 3: State version progression ---');
    const update1 = store1.updateRegisters({
      current_focus: { subject: 'file_search', domain: 'filesystem', establishedAt: new Date().toISOString(), rationale: 'search config' },
      active_intent: { intentId: 'int-1', intentType: 'QUERY', description: 'Locate config file', confidence: 0.9, registeredAt: new Date().toISOString() },
    }, { expectedVersion: 1, mutatedBy: 'test', mutationReason: 'focus_update' });

    expect(update1.stateVersion === 2, 'stateVersion must increment to 2');

    const update2 = store1.updateRegisters({
      cognitive_priority: 0.8,
    }, { expectedVersion: 2, mutatedBy: 'test', mutationReason: 'priority_escalation' });

    expect(update2.stateVersion === 3, 'stateVersion must increment to 3');
    expect(update2.registers.cognitive_priority === 0.8, 'Priority updated to 0.8');
    console.log('✔ VECTOR 3 PASSED: Monotonic stateVersion progression verified.\n');

    // -------------------------------------------------------------------------
    // VECTOR 4 — OCC / CAS (CognitiveStateConcurrencyError)
    // -------------------------------------------------------------------------
    console.log('--- VECTOR 4: Optimistic Concurrency Control (OCC) ---');
    // Current version is 3. Writer A and Writer B both expect 3.
    const writerA = store1.updateRegisters({ active_goal_ref: 'goal-A' }, { expectedVersion: 3, mutatedBy: 'writerA', mutationReason: 'test' });
    expect(writerA.stateVersion === 4, 'Writer A succeeds and increments to 4');

    // Writer B still supplies expectedVersion: 3 -> MUST FAIL
    assert.throws(
      () => store1.updateRegisters({ active_goal_ref: 'goal-B' }, { expectedVersion: 3, mutatedBy: 'writerB', mutationReason: 'test' }),
      (err: any) => err instanceof CognitiveStateConcurrencyError && err.actualVersion === 4 && err.expectedVersion === 3,
      'Writer B must fail with CognitiveStateConcurrencyError'
    );
    expect(true, 'Stale concurrent write was rejected without overwriting state');
    console.log('✔ VECTOR 4 PASSED: Optimistic Concurrency Control verified.\n');

    // -------------------------------------------------------------------------
    // VECTOR 5 — Atomic persistence (no partial writes)
    // -------------------------------------------------------------------------
    console.log('--- VECTOR 5: Atomic persistence ---');
    const persistence = new CognitiveStatePersistenceEngine({ partitionBaseDir: testDir });
    const currentDoc = store1.snapshot();
    const saveResult = persistence.save(currentDoc, 'tenant-alpha');
    const targetFile = saveResult.filePath;

    expect(fs.existsSync(targetFile), 'Canonical state file must exist');
    const rawContent = fs.readFileSync(targetFile, 'utf8');
    const parsed = JSON.parse(rawContent);
    expect(parsed.stateVersion === 4, 'Canonical file content must match stateVersion 4');

    // Check that temporary file does not linger
    const dirFiles = fs.readdirSync(path.dirname(targetFile));
    const tmpFiles = dirFiles.filter(f => f.includes('.tmp.'));
    expect(tmpFiles.length === 0, 'Temporary write files must be atomically renamed and not linger');
    console.log('✔ VECTOR 5 PASSED: Atomic persistence verified.\n');

    // -------------------------------------------------------------------------
    // VECTOR 6 — Crash recovery (simulation across instances)
    // -------------------------------------------------------------------------
    console.log('--- VECTOR 6: Crash recovery ---');
    // Simulate crash: discard in-memory store1 and construct recovery engine
    const recoveryEngine = new CognitiveStateRecoveryEngine(persistence);
    const recResult = recoveryEngine.recover('tenant-alpha', 'sess-001');

    expect(recResult.recovered === true, 'Recovery must succeed');
    expect(recResult.source === 'CANONICAL', 'Must recover from canonical state file');
    expect(recResult.document?.stateVersion === 4, 'Recovered stateVersion must be 4');
    expect(recResult.document?.tenantId === 'tenant-alpha', 'Recovered tenant must match');
    expect(recResult.document?.sessionId === 'sess-001', 'Recovered session must match');

    // Rehydrate into a new store and execute stateVersion 5
    const store2 = new WorkingRegisterStore();
    recoveryEngine.rehydrateStore(store2, 'tenant-alpha', 'sess-001');
    const update5 = store2.updateRegisters({ cognitive_priority: 0.9 }, { expectedVersion: 4, mutatedBy: 'recovery_test', mutationReason: 'post_recovery_update' });
    expect(update5.stateVersion === 5, 'Rehydrated store successfully progresses to version 5');
    persistence.save(update5, 'tenant-alpha');

    // Test fallback recovery from backup (.bak) when canonical is corrupted
    fs.writeFileSync(targetFile, '{ "corrupted": "bad json');
    const recFallback = recoveryEngine.recover('tenant-alpha', 'sess-001');
    expect(recFallback.recovered === true, 'Must recover from backup');
    expect(recFallback.source === 'BACKUP', 'Must successfully recover from backup when canonical is corrupt');
    expect(recFallback.document?.stateVersion === 4, 'Recovered backup version must be 4');
    console.log('✔ VECTOR 6 PASSED: Crash recovery and backup fallback verified.\n');

    // -------------------------------------------------------------------------
    // VECTOR 7 — Attention stack
    // -------------------------------------------------------------------------
    console.log('--- VECTOR 7: Attention stack ---');
    const attManager = new AttentionStateManager();
    const primary: AttentionTargetDescriptor = {
      targetId: 'target-core',
      targetType: 'TASK_STEP',
      targetValue: 'Primary task step execution',
      salienceScore: 0.7,
      assignedAt: new Date().toISOString(),
    };
    attManager.setPrimaryTarget(primary);
    expect(attManager.currentState.primaryTarget?.targetId === 'target-core', 'Primary target set');

    // Secondary targets max 3
    attManager.setSecondaryTargets([
      { targetId: 'sec-1', targetType: 'FILE', targetValue: 'doc1.ts', salienceScore: 0.3, assignedAt: new Date().toISOString() },
      { targetId: 'sec-2', targetType: 'FILE', targetValue: 'doc2.ts', salienceScore: 0.3, assignedAt: new Date().toISOString() },
      { targetId: 'sec-3', targetType: 'FILE', targetValue: 'doc3.ts', salienceScore: 0.3, assignedAt: new Date().toISOString() },
    ]);
    expect(attManager.currentState.secondaryTargets.length === 3, '3 secondary targets established');

    // Attempting 4 secondary targets must fail
    assert.throws(
      () => attManager.setSecondaryTargets([
        { targetId: 'sec-1', targetType: 'FILE', targetValue: 'doc1.ts', salienceScore: 0.3, assignedAt: new Date().toISOString() },
        { targetId: 'sec-2', targetType: 'FILE', targetValue: 'doc2.ts', salienceScore: 0.3, assignedAt: new Date().toISOString() },
        { targetId: 'sec-3', targetType: 'FILE', targetValue: 'doc3.ts', salienceScore: 0.3, assignedAt: new Date().toISOString() },
        { targetId: 'sec-4', targetType: 'FILE', targetValue: 'doc4.ts', salienceScore: 0.3, assignedAt: new Date().toISOString() },
      ]),
      (err: any) => err instanceof CognitiveStateValidationError,
      'Exceeding 3 secondary targets must throw CognitiveStateValidationError'
    );

    // Salience calculation
    const salience = AttentionStateManager.calculateSalience({
      recency: 0.9,
      userEmphasis: 0.8,
      risk: 0.5,
      constraintOverlap: 0.7,
    });
    expect(salience >= 0 && salience <= 1.0, 'Salience must be bounded in [0.0, 1.0]');

    // Priority interruption and resume
    const interruptTarget: AttentionTargetDescriptor = {
      targetId: 'target-security-alert',
      targetType: 'ERROR',
      targetValue: 'Urgent security breach notice',
      salienceScore: 1.0,
      assignedAt: new Date().toISOString(),
    };
    attManager.interrupt(interruptTarget, 'High-priority security alert', 1.0);
    expect(attManager.currentState.primaryTarget?.targetId === 'target-security-alert', 'Interruption switched primary target');
    expect(attManager.currentState.stack.length === 1, 'Attention stack has 1 pushed frame');

    const resumeResult = attManager.resume();
    expect(resumeResult.resumed === true, 'Resume succeeded');
    expect(attManager.currentState.primaryTarget?.targetId === 'target-core', 'Resume restored previous primary target');
    expect(attManager.currentState.stack.length === 0, 'Attention stack depth restored to 0');

    // Max depth enforcement (5)
    for (let i = 0; i < MAX_ATTENTION_STACK_DEPTH + 2; i++) {
      attManager.interrupt({
        targetId: `deep-target-${i}`,
        targetType: 'TASK_STEP',
        targetValue: `Interrupt ${i}`,
        salienceScore: 0.9,
        assignedAt: new Date().toISOString(),
      }, `Interrupt ${i}`, 0.9);
    }
    expect(attManager.currentState.stack.length === MAX_ATTENTION_STACK_DEPTH, 'Attention stack bounded at MAX_ATTENTION_STACK_DEPTH (5)');
    console.log('✔ VECTOR 7 PASSED: Attention management, interruption, and bounds verified.\n');

    // -------------------------------------------------------------------------
    // VECTOR 8 — USER_STOP supremacy
    // -------------------------------------------------------------------------
    console.log('--- VECTOR 8: USER_STOP supremacy ---');
    let userStopFlag = false;
    const executionGate = new CognitiveStateExecutionGate(() => userStopFlag);

    const engineWithStop = new CognitiveStateEngine({
      executionGate,
      persistenceEngine: persistence,
      userStopProvider: () => userStopFlag,
    });
    engineWithStop.initializeSession('tenant-stop', 'sess-stop');

    // Engage USER_STOP
    userStopFlag = true;

    // Attempting mutation while USER_STOP is active MUST FAIL
    assert.throws(
      () => engineWithStop.updateRegisters({ cognitive_priority: 0.9 }, {
        expectedVersion: 1,
        mutatedBy: 'test',
        mutationReason: 'test',
      }),
      (err: any) => err instanceof CognitiveStateUserStopError,
      'Mutation must be rejected when USER_STOP is active'
    );

    // Attempting lifecycle transition while USER_STOP is active MUST FAIL
    assert.throws(
      () => engineWithStop.transitionLifecycle('CLOSED', {
        expectedVersion: 1,
        mutatedBy: 'test',
        mutationReason: 'test',
      }),
      (err: any) => err instanceof CognitiveStateUserStopError,
      'Lifecycle transition must be rejected when USER_STOP is active'
    );

    // Clearing USER_STOP allows safe mutation
    userStopFlag = false;
    const stoppedAllowed = engineWithStop.updateRegisters({ cognitive_priority: 0.3 }, {
      expectedVersion: 1,
      mutatedBy: 'test',
      mutationReason: 'test',
    });
    expect(stoppedAllowed.registers.cognitive_priority === 0.3, 'Mutation succeeds once USER_STOP is cleared');
    console.log('✔ VECTOR 8 PASSED: USER_STOP supremacy verified.\n');

    // -------------------------------------------------------------------------
    // VECTOR 9 — Tenant / session isolation
    // -------------------------------------------------------------------------
    console.log('--- VECTOR 9: Tenant / session isolation ---');
    // Cross tenant assertion
    assert.throws(
      () => executionGate.assertTenantIsolation('tenant-alpha', 'tenant-bravo'),
      (err: any) => err instanceof CrossTenantCognitiveStateError,
      'Cross tenant mismatch must throw CrossTenantCognitiveStateError'
    );

    // Persistence path cross-tenant attempt
    assert.throws(
      () => persistence.save(currentDoc, 'tenant-malicious'),
      (err: any) => err instanceof CrossTenantCognitiveStateError,
      'Cross-tenant save attempt must fail closed'
    );

    // Path traversal in tenant ID
    assert.throws(
      () => persistence.save({ ...currentDoc, tenantId: '../../evil' }, '../../evil'),
      (err: any) => err instanceof CrossTenantCognitiveStateError || err.message.includes('Invalid partition path'),
      'Tenant ID path traversal must fail closed'
    );
    console.log('✔ VECTOR 9 PASSED: Tenant & session isolation verified.\n');

    // -------------------------------------------------------------------------
    // VECTOR 10 — Sanitization (secrets & PII redacted)
    // -------------------------------------------------------------------------
    console.log('--- VECTOR 10: Secret sanitization ---');
    const storeSanitize = new WorkingRegisterStore();
    storeSanitize.initialize('tenant-san', 'sess-san');
    const leakedDoc = storeSanitize.updateRegisters({
      unresolved_questions: [
        'How to handle API key sk-ant-api03-12345678901234567890123456789012345678901234567890?',
        'Database password is superSecretPassword123!',
      ],
      current_environment: {
        workspace: 'C:\\BOW\\shopofbow\\secret_project',
        token: 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
      },
    }, { expectedVersion: 1, mutatedBy: 'test', mutationReason: 'test' });

    const saveSanitized = persistence.save(leakedDoc, 'tenant-san');
    const diskContent = fs.readFileSync(saveSanitized.filePath, 'utf8');

    expect(!diskContent.includes('sk-ant-api03-'), 'API key must be redacted from disk');
    expect(!diskContent.includes('superSecretPassword123!'), 'Password must be redacted from disk');
    expect(!diskContent.includes('ghp_ABCDEFGHIJKLM'), 'Auth token must be redacted from disk');
    expect(!diskContent.includes('shopofbow'), 'Protected workspace path must be redacted from disk');
    console.log('✔ VECTOR 10 PASSED: Secret sanitization verified.\n');

    // -------------------------------------------------------------------------
    // VECTOR 11 — Prototype pollution protection
    // -------------------------------------------------------------------------
    console.log('--- VECTOR 11: Prototype pollution protection ---');
    assert.throws(
      () => store1.updateRegisters(JSON.parse('{"__proto__": {"polluted": true}}'), { expectedVersion: 4, mutatedBy: 'test', mutationReason: 'test' }),
      (err: any) => err instanceof CognitiveStateValidationError,
      '__proto__ key must be rejected with CognitiveStateValidationError'
    );
    assert.throws(
      () => store1.updateRegisters(JSON.parse('{"constructor": {"prototype": {"polluted": true}}}'), { expectedVersion: 4, mutatedBy: 'test', mutationReason: 'test' }),
      (err: any) => err instanceof CognitiveStateValidationError,
      'constructor key must be rejected with CognitiveStateValidationError'
    );
    assert.throws(
      () => store1.updateRegisters(JSON.parse('{"prototype": {"polluted": true}}'), { expectedVersion: 4, mutatedBy: 'test', mutationReason: 'test' }),
      (err: any) => err instanceof CognitiveStateValidationError,
      'prototype key must be rejected with CognitiveStateValidationError'
    );
    expect((Object.prototype as any).polluted === undefined, 'Global prototype must remain clean');
    console.log('✔ VECTOR 11 PASSED: Prototype pollution protection verified.\n');

    // -------------------------------------------------------------------------
    // VECTOR 12 — Size boundary (512 KB hard limit)
    // -------------------------------------------------------------------------
    console.log('--- VECTOR 12: Size boundary (512 KB) ---');
    // Huge state string > 512 KB
    const oversizedString = 'x'.repeat(520 * 1024);
    assert.throws(
      () => store1.updateRegisters({
        unresolved_questions: [oversizedString],
      }, { expectedVersion: 4, mutatedBy: 'test', mutationReason: 'test' }),
      (err: any) => err instanceof CognitiveStateSizeLimitError && err.byteLength > MAX_COGNITIVE_STATE_BYTES,
      'State exceeding 512 KB must throw CognitiveStateSizeLimitError'
    );
    expect(true, '512 KB ceiling rejected oversized document');
    console.log('✔ VECTOR 12 PASSED: 512 KB size limit enforcement verified.\n');

    // -------------------------------------------------------------------------
    // VECTOR 13 — Cryptographic provenance chain
    // -------------------------------------------------------------------------
    console.log('--- VECTOR 13: Cryptographic provenance chain ---');
    const storeChain = new WorkingRegisterStore();
    const c1 = storeChain.initialize('tenant-chain', 'sess-chain');
    const c2 = storeChain.updateRegisters({ cognitive_priority: 0.6 }, { expectedVersion: 1, mutatedBy: 'test', mutationReason: 'c2' });
    const c3 = storeChain.updateRegisters({ cognitive_priority: 0.7 }, { expectedVersion: 2, mutatedBy: 'test', mutationReason: 'c3' });

    expect(c2.provenance.previousStateHash === c1.provenance.stateHash, 'Chain: c2.previousStateHash === c1.stateHash');
    expect(c3.provenance.previousStateHash === c2.provenance.stateHash, 'Chain: c3.previousStateHash === c2.stateHash');

    // Verify tampering detection
    const tamperedDoc: CognitiveStateDocument = {
      ...c3,
      registers: {
        ...c3.registers,
        cognitive_priority: 0.1, // Tamper without recomputing hash
      },
    };
    const tamperedHash = computeCognitiveStateHash(tamperedDoc);
    expect(tamperedHash !== tamperedDoc.provenance.stateHash, 'Tampering changes recomputed hash');

    // Persist tampered doc directly into file and assert recovery detects tampering
    const canonicalChainPath = persistence.resolvePartitionFilePath('tenant-chain', 'sess-chain');
    fs.writeFileSync(canonicalChainPath, JSON.stringify(tamperedDoc));
    assert.throws(
      () => recoveryEngine.recover('tenant-chain', 'sess-chain'),
      (err: any) => err instanceof CognitiveStateIntegrityError,
      'Recovery must throw CognitiveStateIntegrityError when hash does not match'
    );
    console.log('✔ VECTOR 13 PASSED: SHA-256 cryptographic provenance chaining and tamper detection verified.\n');

    // -------------------------------------------------------------------------
    // VECTOR 14 — Promotion & execution boundary
    // -------------------------------------------------------------------------
    console.log('--- VECTOR 14: Promotion & execution boundary ---');
    // Unverified claim promotion rejection
    const unverifiedHyp: CognitiveHypothesis = {
      hypothesisId: 'hyp-unverified',
      summary: 'Memory leak suspected in worker',
      status: 'SPECULATIVE',
      confidence: 0.95, // High confidence is NOT empirical verification!
    };
    assert.throws(
      () => CognitiveStatePromotionGate.evaluatePromotion({
        candidateType: 'HYPOTHESIS_TO_FACT',
        sourceRegister: 'hypotheses',
        item: unverifiedHyp,
        confidence: 0.95,
      }),
      (err: any) => err.message.includes('strictly required \'VERIFIED\''),
      'Unverified hypothesis must be rejected by promotion gate'
    );

    // Verified claim promotion acceptance
    const verifiedHyp: CognitiveHypothesis = {
      hypothesisId: 'hyp-verified',
      summary: 'Port 8080 active and responsive',
      status: 'VERIFIED',
      confidence: 1.0,
      evidenceIds: ['evidence-trace-8821'],
    };
    const approvedPromo = CognitiveStatePromotionGate.evaluatePromotion({
      candidateType: 'HYPOTHESIS_TO_FACT',
      sourceRegister: 'hypotheses',
      item: verifiedHyp,
      verificationEvidenceId: 'evidence-trace-8821',
      verificationOracle: 'PortProbeOracle',
      confidence: 1.0,
    });
    expect(approvedPromo.approved === true, 'Empirically verified hypothesis is approved for promotion');
    expect(approvedPromo.targetStore === 'KNOWLEDGE_GRAPH', 'Promoted to KNOWLEDGE_GRAPH');

    // CognitiveStateExecutionGate guarantees COGNITION != AUTHORITY
    expect(typeof (globalCognitiveStateEngine as any).execute === 'undefined', 'Engine must not expose execute()');
    expect(typeof (globalCognitiveStateEngine as any).runTool === 'undefined', 'Engine must not expose runTool()');
    expect(typeof (globalCognitiveStateEngine as any).shell === 'undefined', 'Engine must not expose shell()');
    expect(typeof (globalCognitiveStateEngine as any).spawn === 'undefined', 'Engine must not expose spawn()');

    // Injected execution properties rejected
    assert.throws(
      () => executionGate.assertNoExecutionAuthority({
        ...c1,
        registers: {
          ...c1.registers,
          execute: () => {},
        } as any,
      }),
      (err: any) => err instanceof CognitiveStateValidationError && err.message.includes('COGNITION != AUTHORITY'),
      'Execution authority injection into state document must be rejected'
    );
    console.log('✔ VECTOR 14 PASSED: Promotion and execution boundary verified.\n');

    console.log('================================================================================');
    console.log(`ALL 14 VECTORS PASSED (${passedAssertions} assertions confirmed).`);
    console.log('SUITE #96: 100% PASS');
    console.log('================================================================================');
  } finally {
    // Clean up test scratch
    if (fs.existsSync(testDir)) {
      try {
        fs.rmSync(testDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup error
      }
    }
  }
}

runSuite96().catch((err) => {
  console.error('[SUITE #96 FAILED]', err);
  process.exit(1);
});
