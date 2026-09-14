// tests/test_v4_ms15_neuro_symbolic_deliberation.ts
// BOWCON V4.0 — MS-1.5.05: NATIVE NEURO-SYMBOLIC DELIBERATION ENGINE
// Dedicated Regression Suite #99
//
// Invariants:
// COGNITION != AUTHORITY
// DELIBERATION != AUTHORIZATION
// DELIBERATION != EXECUTION
// HYPOTHESIS != FACT
// HYPOTHESIS != EVIDENCE
// EVIDENCE != PROOF
// VECTOR MATCH != TRUTH
// PRIORITY != AUTHORIZATION
// USER_STOP > ALL MUTATION
// LLM OUTPUT != AUTHORITATIVE STATE
// WORKING STATE != DURABLE TRUTH
// ZERO_DIRECT_TOOL_EXECUTION == TRUE
// FAIL_CLOSED_ON_CONTRADICTION == TRUE
// NO_RAW_CHAIN_OF_THOUGHT_PERSISTENCE == TRUE

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import {
  DELIBERATION_SCHEMA_VERSION,
  DELIBERATION_BOUNDS,
  CANONICAL_DELIBERATION_WEIGHTS,
  DeliberationError,
  DeliberationValidationError,
  DeliberationTransitionError,
  DeliberationConcurrencyError,
  CrossTenantDeliberationError,
  DeliberationUserStopError,
  DeliberationCoTProhibitedError,
  DeliberationIntegrityError,
  DeliberationSecurityError,
  DeliberationCapacityError,
  ContradictionError,
  type HypothesisProposalInput,
  type DeliberationHypothesis,
  type EvidenceBinding,
  type SymbolicConstraint,
  type DeliberationSessionDocument,
  computeDeterministicHypothesisId,
  computeHypothesisHash,
  computeEvidenceBindingHash,
  computeResultHash,
  computeSessionProvenanceHash,
  DeliberationValidator,
  EvidenceBindingEngine,
  HypothesisEngine,
  SymbolicConstraintEngine,
  DeliberationSearchEngine,
  ContradictionResolver,
  DeliberationLifecycleManager,
  DeliberationPersistenceRecoveryEngine,
} from '../src/core/deliberation/index.js';

import { globalMasterHumanAuthority } from '../src/core/authority/masterHumanAuthority.js';
import { WorkingRegisterStore } from '../src/core/cognitiveState/workingRegisterStore.js';

let passedAssertions = 0;

function expect(condition: boolean, msg: string): void {
  assert(condition, msg);
  passedAssertions++;
}

async function runRegressionSuite99(): Promise<void> {
  console.log('================================================================================');
  console.log('BOWCON V4 — MS-1.5.05 DEDICATED REGRESSION SUITE #99');
  console.log('NATIVE NEURO-SYMBOLIC DELIBERATION ENGINE');
  console.log('================================================================================\n');

  const testTempDir = path.resolve(process.cwd(), 'data', 'test_deliberation_tmp');
  if (fs.existsSync(testTempDir)) {
    fs.rmSync(testTempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testTempDir, { recursive: true });

  const cleanupTestDir = () => {
    if (fs.existsSync(testTempDir)) {
      try {
        fs.rmSync(testTempDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  };

  // --------------------------------------------------------------------------
  // VECTOR 1: Deliberation schema contracts
  // --------------------------------------------------------------------------
  console.log('[VECTOR 1] Deliberation schema contracts');
  {
    expect(DELIBERATION_SCHEMA_VERSION === 1, 'Schema version is 1');
    expect(DELIBERATION_BOUNDS.MAX_DELIBERATION_SESSIONS_PER_TENANT === 50, 'Max sessions is 50');
    expect(DELIBERATION_BOUNDS.MAX_HYPOTHESES_PER_SESSION === 20, 'Max hypotheses is 20');
    expect(DELIBERATION_BOUNDS.MAX_EVIDENCE_PER_HYPOTHESIS === 30, 'Max evidence is 30');
    expect(DELIBERATION_BOUNDS.MAX_INFERENCE_DEPTH === 6, 'Max inference depth is 6');
    expect(CANONICAL_DELIBERATION_WEIGHTS.symbolicValidityWeight === 0.60, 'Symbolic validity weight is 0.60');
    expect(CANONICAL_DELIBERATION_WEIGHTS.neuralPlausibilityWeight === 0.40, 'Neural plausibility weight is 0.40');
  }

  // --------------------------------------------------------------------------
  // VECTOR 2: Malformed/oversized proposal rejection
  // --------------------------------------------------------------------------
  console.log('[VECTOR 2] Malformed/oversized proposal rejection');
  {
    let rejected = false;
    try {
      DeliberationValidator.validateProposal(null);
    } catch (e) {
      if (e instanceof DeliberationValidationError) rejected = true;
    }
    expect(rejected, 'Rejected null proposal');

    rejected = false;
    try {
      DeliberationValidator.validateProposal({
        tenantId: 'tenant_1',
        title: '',
        premise: 'Valid premise',
      });
    } catch (e) {
      if (e instanceof DeliberationValidationError) rejected = true;
    }
    expect(rejected, 'Rejected empty title');

    rejected = false;
    try {
      DeliberationValidator.validateProposal({
        tenantId: 'tenant_1',
        title: 'T'.repeat(DELIBERATION_BOUNDS.MAX_TITLE_LENGTH + 10),
        premise: 'Valid premise',
      });
    } catch (e) {
      if (e instanceof DeliberationValidationError) rejected = true;
    }
    expect(rejected, 'Rejected oversized title');
  }

  // --------------------------------------------------------------------------
  // VECTOR 3: Deliberation lifecycle
  // --------------------------------------------------------------------------
  console.log('[VECTOR 3] Deliberation lifecycle');
  {
    const mgr = new DeliberationLifecycleManager();
    const session = mgr.createSession('tenant_alpha', 'GOAL_REFINEMENT');
    expect(session.status === 'INITIALIZING', 'Initial status is INITIALIZING');
    expect(session.sessionVersion === 1, 'Initial version is 1');

    const started = mgr.startDeliberation(session, 1);
    expect(started.status === 'DELIBERATING', 'Status transitioned to DELIBERATING');
    expect(started.sessionVersion === 2, 'Session version incremented to 2');
  }

  // --------------------------------------------------------------------------
  // VECTOR 4: Illegal lifecycle transition rejection
  // --------------------------------------------------------------------------
  console.log('[VECTOR 4] Illegal lifecycle transition rejection');
  {
    const mgr = new DeliberationLifecycleManager();
    const session = mgr.createSession('tenant_alpha', 'GOAL_REFINEMENT');

    let rejected = false;
    try {
      mgr.resolveSession(session, 1);
    } catch (e) {
      if (e instanceof DeliberationTransitionError) rejected = true;
    }
    expect(rejected, 'Direct transition from INITIALIZING to RESOLVED rejected');
  }

  // --------------------------------------------------------------------------
  // VECTOR 5: Evidence binding
  // --------------------------------------------------------------------------
  console.log('[VECTOR 5] Evidence binding');
  {
    const evEngine = new EvidenceBindingEngine();
    const ev = evEngine.bindEvidence(
      {
        tenantId: 'tenant_alpha',
        sourceType: 'USER_DIRECTIVE',
        sourceReferenceId: 'directive_101',
        statement: 'The production database port is 5432.',
        confidence: 1.0,
      },
      'tenant_alpha'
    );
    expect(ev.isEmpiricallyVerified === true, 'USER_DIRECTIVE is empirically verified');
    expect(ev.statement.includes('5432'), 'Statement retained');
  }

  // --------------------------------------------------------------------------
  // VECTOR 6: Evidence provenance
  // --------------------------------------------------------------------------
  console.log('[VECTOR 6] Evidence provenance');
  {
    const evEngine = new EvidenceBindingEngine();
    const ev = evEngine.bindEvidence(
      {
        tenantId: 'tenant_alpha',
        sourceType: 'SYSTEM_EMPIRICAL_OBSERVATION',
        sourceReferenceId: 'obs_999',
        statement: 'Latency measured at 12ms',
        confidence: 0.95,
      },
      'tenant_alpha'
    );
    const recomputed = computeEvidenceBindingHash(ev);
    expect(ev.provenanceHash === recomputed, 'Evidence provenance hash matches SHA-256 content');
  }

  // --------------------------------------------------------------------------
  // VECTOR 7: Neural/symbolic separation
  // --------------------------------------------------------------------------
  console.log('[VECTOR 7] Neural/symbolic separation');
  {
    const cEngine = new SymbolicConstraintEngine();
    const hEngine = new HypothesisEngine();
    const sEngine = new DeliberationSearchEngine({ constraintEngine: cEngine, hypothesisEngine: hEngine });

    // High neural plausibility 0.99, but symbolic MUST_NOT constraint violated
    const proposal: HypothesisProposalInput = {
      tenantId: 'tenant_alpha',
      title: 'Delete root directory',
      premise: 'High plausibility neural hallucination to clean up',
      plausibilityScore: 0.99,
    };
    const hypo = hEngine.createHypothesis(proposal, 'session_1');

    const constraint = cEngine.createConstraint({
      constraintId: 'c_prohibit_delete',
      predicate: 'prohibit:delete',
      polarity: 'MUST_NOT',
    });

    const searchOutcome = sEngine.searchAndRank([hypo], [constraint], []);
    const evaluated = searchOutcome.evaluatedHypotheses[0];
    expect(evaluated.validityScore === 0.0, 'Symbolic validity score forced to 0.0 on MUST_NOT violation');
    expect(evaluated.combinedConfidence === 0.0, 'Combined confidence forced to 0.0 despite 0.99 plausibility');
    expect(evaluated.status === 'CONTRADICTED', 'Hypothesis transitioned to CONTRADICTED');
  }

  // --------------------------------------------------------------------------
  // VECTOR 8: Hypothesis generation
  // --------------------------------------------------------------------------
  console.log('[VECTOR 8] Hypothesis generation');
  {
    const hEngine = new HypothesisEngine();
    const proposal: HypothesisProposalInput = {
      tenantId: 'tenant_alpha',
      title: 'Cache query results',
      premise: 'Caching results in memory will reduce database read load',
      plausibilityScore: 0.85,
    };
    const hypo = hEngine.createHypothesis(proposal, 'session_1');
    expect(hypo.status === 'PROPOSED', 'New hypothesis status is PROPOSED');
    expect(hypo.version === 1, 'Version is 1');
    expect(hypo.provenanceHash.length === 64, 'Provenance hash is 64-char hex');
  }

  // --------------------------------------------------------------------------
  // VECTOR 9: Hypothesis scoring
  // --------------------------------------------------------------------------
  console.log('[VECTOR 9] Hypothesis scoring');
  {
    const cEngine = new SymbolicConstraintEngine();
    const hEngine = new HypothesisEngine();
    const sEngine = new DeliberationSearchEngine({ constraintEngine: cEngine, hypothesisEngine: hEngine });

    const hypo = hEngine.createHypothesis(
      {
        tenantId: 'tenant_alpha',
        title: 'Optimize index',
        premise: 'Adding an index will improve query time',
        plausibilityScore: 0.8,
      },
      'session_1'
    );

    const outcome = sEngine.searchAndRank([hypo], [], []);
    const evaluated = outcome.evaluatedHypotheses[0];
    expect(evaluated.validityScore === 1.0, 'Validity score is 1.0 when no constraints exist');
    // Combined = 0.60 * 1.0 + 0.40 * 0.8 = 0.60 + 0.32 = 0.92
    expect(evaluated.combinedConfidence === 0.92, `Score computed deterministically: ${evaluated.combinedConfidence}`);
  }

  // --------------------------------------------------------------------------
  // VECTOR 10: Score bounds [0,1]
  // --------------------------------------------------------------------------
  console.log('[VECTOR 10] Score bounds [0,1]');
  {
    const hEngine = new HypothesisEngine();
    let outOfBoundsRejected = false;
    try {
      hEngine.createHypothesis(
        {
          tenantId: 'tenant_alpha',
          title: 'Test bounds',
          premise: 'Bounds verification',
          plausibilityScore: 1.5, // should be rejected fails-closed
        },
        'session_1'
      );
    } catch (e) {
      if (e instanceof DeliberationValidationError) outOfBoundsRejected = true;
    }
    expect(outOfBoundsRejected, 'Out-of-bounds plausibility score (> 1.0) rejected fails-closed');

    const hypo = hEngine.createHypothesis(
      {
        tenantId: 'tenant_alpha',
        title: 'Test valid bounds',
        premise: 'Bounds verification',
        plausibilityScore: 0.75,
      },
      'session_1'
    );
    expect(hypo.plausibilityScore <= 1.0 && hypo.plausibilityScore >= 0.0, 'Plausibility in [0,1]');
    expect(hypo.validityScore <= 1.0 && hypo.validityScore >= 0.0, 'Validity in [0,1]');
    expect(hypo.combinedConfidence <= 1.0 && hypo.combinedConfidence >= 0.0, 'Combined confidence in [0,1]');
  }

  // --------------------------------------------------------------------------
  // VECTOR 11: Deterministic tie-breaking
  // --------------------------------------------------------------------------
  console.log('[VECTOR 11] Deterministic tie-breaking');
  {
    const hEngine = new HypothesisEngine();
    const evEngine = new EvidenceBindingEngine();
    const sEngine = new DeliberationSearchEngine();

    const evVerified = evEngine.bindEvidence(
      {
        tenantId: 'tenant_alpha',
        sourceType: 'USER_DIRECTIVE',
        sourceReferenceId: 'u1',
        statement: 'directive confirmed',
        confidence: 1.0,
      },
      'tenant_alpha'
    );

    const hypoA = hEngine.createHypothesis(
      {
        tenantId: 'tenant_alpha',
        title: 'Alpha plan',
        premise: 'Plan A',
        plausibilityScore: 0.8,
        supportingEvidenceIds: [evVerified.evidenceId],
      },
      'session_1',
      undefined,
      '2026-09-14T00:00:00.000Z'
    );

    const hypoB = hEngine.createHypothesis(
      {
        tenantId: 'tenant_alpha',
        title: 'Beta plan',
        premise: 'Plan B',
        plausibilityScore: 0.8,
        supportingEvidenceIds: [],
      },
      'session_1',
      undefined,
      '2026-09-14T00:00:00.000Z'
    );

    const outcome = sEngine.searchAndRank([hypoB, hypoA], [], [evVerified]);
    expect(outcome.evaluatedHypotheses[0].hypothesisId === hypoA.hypothesisId, 'Hypothesis with verified evidence won tie-break');
  }

  // --------------------------------------------------------------------------
  // VECTOR 12: Symbolic MUST constraints
  // --------------------------------------------------------------------------
  console.log('[VECTOR 12] Symbolic MUST constraints');
  {
    const cEngine = new SymbolicConstraintEngine();
    const hEngine = new HypothesisEngine();

    const mustConstraint = cEngine.createConstraint({
      constraintId: 'must_have_auth',
      predicate: 'contains:authorization',
      polarity: 'MUST',
    });

    const hypoValid = hEngine.createHypothesis(
      {
        tenantId: 'tenant_alpha',
        title: 'Include authorization header',
        premise: 'Request requires authorization token',
      },
      'session_1'
    );

    const resValid = cEngine.evaluateHypothesis(hypoValid, [mustConstraint]);
    expect(resValid.satisfiedConstraintIds.includes('must_have_auth'), 'MUST satisfied');
    expect(resValid.validityScore === 1.0, 'Validity is 1.0');

    const hypoInvalid = hEngine.createHypothesis(
      {
        tenantId: 'tenant_alpha',
        title: 'Omit security credentials',
        premise: 'Unauthenticated plain call',
      },
      'session_1'
    );

    const resInvalid = cEngine.evaluateHypothesis(hypoInvalid, [mustConstraint]);
    expect(resInvalid.violatedConstraintIds.includes('must_have_auth'), 'MUST violated');
    expect(resInvalid.validityScore < 1.0, 'Validity score dropped');
  }

  // --------------------------------------------------------------------------
  // VECTOR 13: Symbolic MUST_NOT constraints
  // --------------------------------------------------------------------------
  console.log('[VECTOR 13] Symbolic MUST_NOT constraints');
  {
    const cEngine = new SymbolicConstraintEngine();
    const hEngine = new HypothesisEngine();

    const mustNotConstraint = cEngine.createConstraint({
      constraintId: 'prohibit_direct_sql',
      predicate: 'prohibit:raw_sql',
      polarity: 'MUST_NOT',
    });

    const hypo = hEngine.createHypothesis(
      {
        tenantId: 'tenant_alpha',
        title: 'Execute raw_sql query',
        premise: 'Bypass ORM with raw_sql string',
      },
      'session_1'
    );

    const evalRes = cEngine.evaluateHypothesis(hypo, [mustNotConstraint]);
    expect(evalRes.violatedConstraintIds.includes('prohibit_direct_sql'), 'MUST_NOT violated');
    expect(evalRes.validityScore === 0.0, 'Validity score 0.0 on MUST_NOT violation');
  }

  // --------------------------------------------------------------------------
  // VECTOR 14: Constraint contradiction detection
  // --------------------------------------------------------------------------
  console.log('[VECTOR 14] Constraint contradiction detection');
  {
    const cEngine = new SymbolicConstraintEngine();
    const resolver = new ContradictionResolver();

    const c1 = cEngine.createConstraint({
      constraintId: 'c1',
      predicate: 'contains:tls_enabled',
      polarity: 'MUST',
    });
    const c2 = cEngine.createConstraint({
      constraintId: 'c2',
      predicate: 'contains:tls_enabled',
      polarity: 'MUST_NOT',
    });

    const analysis = resolver.detectAndAnalyze([], [c1, c2], []);
    expect(analysis.hasCriticalContradiction === true, 'Critical constraint contradiction detected');
    expect(analysis.requiresHumanReview === true, 'Requires human review flagged');
  }

  // --------------------------------------------------------------------------
  // VECTOR 15: Bounded multi-hypothesis search
  // --------------------------------------------------------------------------
  console.log('[VECTOR 15] Bounded multi-hypothesis search');
  {
    const hEngine = new HypothesisEngine();
    const sEngine = new DeliberationSearchEngine();

    const hypos: DeliberationHypothesis[] = [];
    for (let i = 0; i < 5; i++) {
      hypos.push(
        hEngine.createHypothesis(
          {
            tenantId: 'tenant_alpha',
            title: `Candidate approach ${i}`,
            premise: `Description for approach ${i}`,
            plausibilityScore: 0.5 + i * 0.1,
          },
          'session_1'
        )
      );
    }

    const outcome = sEngine.searchAndRank(hypos, [], []);
    expect(outcome.evaluatedHypotheses.length === 5, 'All 5 hypotheses evaluated');
    expect(outcome.topHypotheses.length <= 5, 'Top hypotheses bounded');
    expect(outcome.winningHypothesis !== null, 'Found winning converged hypothesis');
  }

  // --------------------------------------------------------------------------
  // VECTOR 16: Search exhaustion → INCONCLUSIVE
  // --------------------------------------------------------------------------
  console.log('[VECTOR 16] Search exhaustion -> INCONCLUSIVE');
  {
    const hEngine = new HypothesisEngine();
    const sEngine = new DeliberationSearchEngine();

    // Low plausibility hypotheses that cannot meet convergence threshold
    const hypos = [
      hEngine.createHypothesis(
        {
          tenantId: 'tenant_alpha',
          title: 'Weak theory 1',
          premise: 'Insufficient data',
          plausibilityScore: 0.1,
        },
        'session_1'
      ),
      hEngine.createHypothesis(
        {
          tenantId: 'tenant_alpha',
          title: 'Weak theory 2',
          premise: 'Unverifiable premise',
          plausibilityScore: 0.15,
        },
        'session_1'
      ),
    ];

    const outcome = sEngine.searchAndRank(hypos, [], [], { convergenceThreshold: 0.85 });
    expect(outcome.isConverged === false, 'Search did not converge');
    expect(outcome.isExhausted === true, 'Search is exhausted');
  }

  // --------------------------------------------------------------------------
  // VECTOR 17: Logical contradiction detection
  // --------------------------------------------------------------------------
  console.log('[VECTOR 17] Logical contradiction detection');
  {
    const hEngine = new HypothesisEngine();
    const resolver = new ContradictionResolver();

    const h1 = hEngine.createHypothesis(
      {
        tenantId: 'tenant_alpha',
        title: 'Enable cache compression',
        premise: 'Enable compression to save bandwidth',
      },
      'session_1'
    );
    const h2 = hEngine.createHypothesis(
      {
        tenantId: 'tenant_alpha',
        title: 'Disable cache compression',
        premise: 'Disable compression to save CPU cycles',
      },
      'session_1'
    );

    const outcome = resolver.detectAndAnalyze([h1, h2], [], []);
    const logical = outcome.contradictions.filter((c) => c.category === 'LOGICAL_CONTRADICTION');
    expect(logical.length > 0, 'Detected logical contradiction between opposing hypotheses');
  }

  // --------------------------------------------------------------------------
  // VECTOR 18: Evidence contradiction detection
  // --------------------------------------------------------------------------
  console.log('[VECTOR 18] Evidence contradiction detection');
  {
    const evEngine = new EvidenceBindingEngine();
    const resolver = new ContradictionResolver();

    const e1 = evEngine.bindEvidence(
      {
        tenantId: 'tenant_alpha',
        sourceType: 'USER_DIRECTIVE',
        sourceReferenceId: 'd1',
        statement: 'Service is active',
        confidence: 1.0,
      },
      'tenant_alpha'
    );
    const e2 = evEngine.bindEvidence(
      {
        tenantId: 'tenant_alpha',
        sourceType: 'USER_DIRECTIVE',
        sourceReferenceId: 'd2',
        statement: 'not Service is active',
        confidence: 1.0,
      },
      'tenant_alpha'
    );

    const outcome = resolver.detectAndAnalyze([], [], [e1, e2]);
    const evContradiction = outcome.contradictions.filter((c) => c.category === 'EVIDENCE_CONTRADICTION');
    expect(evContradiction.length > 0, 'Detected direct evidence contradiction');
  }

  // --------------------------------------------------------------------------
  // VECTOR 19: Goal contradiction detection
  // --------------------------------------------------------------------------
  console.log('[VECTOR 19] Goal contradiction detection');
  {
    const hEngine = new HypothesisEngine();
    const resolver = new ContradictionResolver();

    const h = hEngine.createHypothesis(
      {
        tenantId: 'tenant_alpha',
        title: 'Action plan',
        premise: 'Plan that contradicts goal target',
      },
      'session_1'
    );

    const outcome = resolver.detectAndAnalyze([h], [], [], 'goal_safe_execution');
    const goalContra = outcome.contradictions.filter((c) => c.category === 'GOAL_CONTRADICTION');
    expect(goalContra.length > 0, 'Detected goal contradiction');
  }

  // --------------------------------------------------------------------------
  // VECTOR 20: Resource/policy contradiction
  // --------------------------------------------------------------------------
  console.log('[VECTOR 20] Resource/policy contradiction');
  {
    const hEngine = new HypothesisEngine();
    const resolver = new ContradictionResolver();

    const h = hEngine.createHypothesis(
      {
        tenantId: 'tenant_alpha',
        title: 'Access protected store',
        premise: 'Attempting to inspect C:\\BOW\\shopofbow for state',
      },
      'session_1'
    );

    const outcome = resolver.detectAndAnalyze([h], [], []);
    const policyContra = outcome.contradictions.filter((c) => c.category === 'POLICY_CONTRADICTION');
    expect(policyContra.length > 0, 'Detected policy breach against protected workspace');
    expect(outcome.requiresHumanReview === true, 'Policy breach mandates human review');
  }

  // --------------------------------------------------------------------------
  // VECTOR 21: Multi-tenant isolation
  // --------------------------------------------------------------------------
  console.log('[VECTOR 21] Multi-tenant isolation');
  {
    const hEngine = new HypothesisEngine();
    let crossTenantBlocked = false;
    try {
      hEngine.createHypothesis(
        {
          tenantId: 'tenant_A',
          title: 'Title',
          premise: 'Premise',
        },
        'session_1',
        'tenant_B' // activeTenantId is tenant_B, proposal is tenant_A
      );
    } catch (e) {
      if (e instanceof CrossTenantDeliberationError) crossTenantBlocked = true;
    }
    expect(crossTenantBlocked, 'Blocked cross-tenant hypothesis creation');
  }

  // --------------------------------------------------------------------------
  // VECTOR 22: Cross-tenant evidence rejection
  // --------------------------------------------------------------------------
  console.log('[VECTOR 22] Cross-tenant evidence rejection');
  {
    const evEngine = new EvidenceBindingEngine();
    let crossEvidenceBlocked = false;
    try {
      evEngine.bindEvidence(
        {
          tenantId: 'tenant_A',
          sourceType: 'USER_DIRECTIVE',
          sourceReferenceId: 'd1',
          statement: 'Sensitive directive',
          confidence: 1.0,
        },
        'tenant_B'
      );
    } catch (e) {
      if (e instanceof CrossTenantDeliberationError) crossEvidenceBlocked = true;
    }
    expect(crossEvidenceBlocked, 'Blocked cross-tenant evidence binding');
  }

  // --------------------------------------------------------------------------
  // VECTOR 23: Session isolation
  // --------------------------------------------------------------------------
  console.log('[VECTOR 23] Session isolation');
  {
    const mgr = new DeliberationLifecycleManager();
    const sessionA = mgr.createSession('tenant_alpha', 'GOAL_REFINEMENT');
    const sessionB = mgr.createSession('tenant_alpha', 'INCIDENT_ROOT_CAUSE');

    expect(sessionA.sessionId !== sessionB.sessionId, 'Session IDs are distinct');
    expect(sessionA.hypotheses.length === 0 && sessionB.hypotheses.length === 0, 'Sessions have independent state');
  }

  // --------------------------------------------------------------------------
  // VECTOR 24: OCC/CAS
  // --------------------------------------------------------------------------
  console.log('[VECTOR 24] OCC/CAS');
  {
    const mgr = new DeliberationLifecycleManager();
    const session = mgr.createSession('tenant_alpha', 'GOAL_REFINEMENT');

    let occError = false;
    try {
      mgr.startDeliberation(session, 999); // expectedVersion 999 !== 1
    } catch (e) {
      if (e instanceof DeliberationConcurrencyError) occError = true;
    }
    expect(occError, 'Rejected mutation with stale expectedVersion');
  }

  // --------------------------------------------------------------------------
  // VECTOR 25: Atomic persistence
  // --------------------------------------------------------------------------
  console.log('[VECTOR 25] Atomic persistence');
  {
    const persistence = new DeliberationPersistenceRecoveryEngine({ baseDir: testTempDir });
    const mgr = new DeliberationLifecycleManager();
    const session = mgr.createSession('tenant_alpha', 'GOAL_REFINEMENT');

    persistence.saveSession(session);
    const loaded = persistence.loadSession(session.sessionId, 'tenant_alpha');

    expect(loaded.sessionId === session.sessionId, 'Session successfully persisted and reloaded');
    expect(loaded.provenanceHash === session.provenanceHash, 'Provenance hash intact after persistence');
  }

  // --------------------------------------------------------------------------
  // VECTOR 26: Backup recovery
  // --------------------------------------------------------------------------
  console.log('[VECTOR 26] Backup recovery');
  {
    const persistence = new DeliberationPersistenceRecoveryEngine({ baseDir: testTempDir });
    const mgr = new DeliberationLifecycleManager();
    const session = mgr.createSession('tenant_alpha', 'GOAL_REFINEMENT');

    // Save initial
    persistence.saveSession(session);

    // Corrupt primary file
    const tenantDir = persistence.getTenantSessionDir('tenant_alpha');
    const primaryFile = path.resolve(tenantDir, `${session.sessionId}.json`);
    const backupFile = path.resolve(tenantDir, `${session.sessionId}.json.bak`);

    // Create valid backup before corrupting primary
    fs.copyFileSync(primaryFile, backupFile);
    fs.writeFileSync(primaryFile, '{ INVALID_JSON CORRUPTED CONTENT', 'utf8');

    // Load should fall back to backup
    const recovered = persistence.loadSession(session.sessionId, 'tenant_alpha');
    expect(recovered.recoveredFromBackup === true, 'Recovered session from .bak snapshot');
  }

  // --------------------------------------------------------------------------
  // VECTOR 27: SHA-256 provenance
  // --------------------------------------------------------------------------
  console.log('[VECTOR 27] SHA-256 provenance');
  {
    const mgr = new DeliberationLifecycleManager();
    const session = mgr.createSession('tenant_alpha', 'GOAL_REFINEMENT');
    const computed = computeSessionProvenanceHash(session);
    expect(session.provenanceHash === computed, 'Session provenance hash matches recomputed canonical SHA-256');
  }

  // --------------------------------------------------------------------------
  // VECTOR 28: Secret/PII sanitization
  // --------------------------------------------------------------------------
  console.log('[VECTOR 28] Secret/PII sanitization');
  {
    const hEngine = new HypothesisEngine();
    const proposal: HypothesisProposalInput = {
      tenantId: 'tenant_alpha',
      title: 'Config with sk-ant-api03-secretkey123456789012345678',
      premise: 'User password=MySecretPassword123 should be redacted',
    };
    const hypo = hEngine.createHypothesis(proposal, 'session_1');
    expect(!hypo.title.includes('secretkey123456789012345678'), 'Anthropic secret key redacted');
    expect(!hypo.premise.includes('MySecretPassword123'), 'Password redacted');
  }

  // --------------------------------------------------------------------------
  // VECTOR 29: Prototype pollution defense
  // --------------------------------------------------------------------------
  console.log('[VECTOR 29] Prototype pollution defense');
  {
    let blocked = false;
    try {
      const parsedMalicious = JSON.parse(
        '{"tenantId":"tenant_alpha","title":"Malicious","premise":"Test","__proto__":{"polluted":true}}'
      );
      DeliberationValidator.validateProposal(parsedMalicious);
    } catch (e) {
      if (e instanceof DeliberationSecurityError || e instanceof DeliberationValidationError) {
        blocked = true;
      }
    }
    expect(blocked, 'JSON-parsed __proto__ prototype pollution rejected');

    let constructorBlocked = false;
    try {
      const parsedConstructor = JSON.parse(
        '{"tenantId":"tenant_alpha","title":"Malicious","premise":"Test","constructor":{"polluted":true}}'
      );
      DeliberationValidator.validateProposal(parsedConstructor);
    } catch (e) {
      if (e instanceof DeliberationSecurityError || e instanceof DeliberationValidationError) {
        constructorBlocked = true;
      }
    }
    expect(constructorBlocked, 'constructor prototype pollution rejected');
  }

  // --------------------------------------------------------------------------
  // VECTOR 30: CoT rejection
  // --------------------------------------------------------------------------
  console.log('[VECTOR 30] CoT rejection');
  {
    let cotBlocked = false;
    try {
      DeliberationValidator.validateProposal({
        tenantId: 'tenant_alpha',
        title: 'Proposal with CoT',
        premise: 'Here is what happened: <thought>internal hidden reasoning</thought>',
      });
    } catch (e) {
      if (e instanceof DeliberationCoTProhibitedError || e instanceof DeliberationValidationError) {
        cotBlocked = true;
      }
    }
    expect(cotBlocked, 'Raw <thought> CoT tag rejected');
  }

  // --------------------------------------------------------------------------
  // VECTOR 31: USER_STOP synchronous preemption
  // --------------------------------------------------------------------------
  console.log('[VECTOR 31] USER_STOP synchronous preemption');
  {
    const userStopActiveProvider = () => true;
    const mgr = new DeliberationLifecycleManager({ userStopProvider: userStopActiveProvider });

    let stopped = false;
    try {
      mgr.createSession('tenant_alpha', 'GOAL_REFINEMENT');
    } catch (e) {
      if (e instanceof DeliberationUserStopError) stopped = true;
    }
    expect(stopped, 'Lifecycle creation synchronously preempted by USER_STOP');

    const hEngine = new HypothesisEngine({ userStopProvider: userStopActiveProvider });
    stopped = false;
    try {
      hEngine.createHypothesis({ tenantId: 't', title: 't', premise: 'p' }, 's');
    } catch (e) {
      if (e instanceof DeliberationUserStopError) stopped = true;
    }
    expect(stopped, 'Hypothesis creation synchronously preempted by USER_STOP');
  }

  // --------------------------------------------------------------------------
  // VECTOR 32: Zero execution authority
  // --------------------------------------------------------------------------
  console.log('[VECTOR 32] Zero execution authority');
  {
    const engines = [
      new EvidenceBindingEngine(),
      new HypothesisEngine(),
      new SymbolicConstraintEngine(),
      new DeliberationSearchEngine(),
      new ContradictionResolver(),
      new DeliberationLifecycleManager(),
      new DeliberationPersistenceRecoveryEngine(),
    ];

    const forbiddenMethods = ['execute', 'runTool', 'shell', 'spawn', 'eval'];
    for (const engine of engines) {
      for (const method of forbiddenMethods) {
        expect(
          (engine as any)[method] === undefined,
          `${engine.constructor.name} has zero execution authority ('${method}' is undefined)`
        );
      }
    }
  }

  // --------------------------------------------------------------------------
  // VECTOR 33: Semantic memory advisory-only behavior
  // --------------------------------------------------------------------------
  console.log('[VECTOR 33] Semantic memory advisory-only behavior');
  {
    const evEngine = new EvidenceBindingEngine();
    const advisoryEv = evEngine.bindEvidence(
      {
        tenantId: 'tenant_alpha',
        sourceType: 'SEMANTIC_MEMORY_REFERENCE',
        sourceReferenceId: 'vec_dense_doc_101',
        statement: 'A similar bug occurred last month',
        confidence: 0.99, // high similarity
      },
      'tenant_alpha'
    );

    // Vector match is NOT empirical proof
    expect(advisoryEv.isEmpiricallyVerified === false, 'Semantic memory reference is NOT marked empirically verified');
  }

  // --------------------------------------------------------------------------
  // VECTOR 34: Working-register boundary
  // --------------------------------------------------------------------------
  console.log('[VECTOR 34] Working-register boundary');
  {
    const workingRegisters = new WorkingRegisterStore();
    const mgr = new DeliberationLifecycleManager({ workingRegisterStore: workingRegisters });

    const session = mgr.createSession('tenant_alpha', 'GOAL_REFINEMENT');
    mgr.startDeliberation(session, 1);

    const snapshot = workingRegisters.snapshot();
    expect(snapshot.registers.current_focus !== null, 'Transient focus projected into working register store');
    expect(snapshot.registers.current_focus?.subject === `deliberation_${session.sessionId}`, 'Current focus reflects session');
  }

  // --------------------------------------------------------------------------
  // VECTOR 35: Historical regression preservation
  // --------------------------------------------------------------------------
  console.log('[VECTOR 35] Historical regression preservation');
  {
    const { LocalCognitiveRuntimeFacade } = await import('../src/core/cognitive/localCognitiveRuntimeFacade.js');
    const { CognitiveStateEngine } = await import('../src/core/cognitiveState/cognitiveStateEngine.js');
    const { NativeVectorIndex } = await import('../src/core/semanticMemory/nativeVectorIndex.js');
    const { GoalFormationEngine } = await import('../src/core/goal/goalFormationEngine.js');

    expect(typeof LocalCognitiveRuntimeFacade === 'function', 'MS-1.5.01 LocalCognitiveRuntimeFacade intact');
    expect(typeof CognitiveStateEngine === 'function', 'MS-1.5.02 CognitiveStateEngine intact');
    expect(typeof NativeVectorIndex === 'function', 'MS-1.5.03 NativeVectorIndex intact');
    expect(typeof GoalFormationEngine === 'function', 'MS-1.5.04 GoalFormationEngine intact');
  }

  // --------------------------------------------------------------------------
  // VECTOR 36: Future milestone leakage = zero
  // --------------------------------------------------------------------------
  console.log('[VECTOR 36] Future milestone leakage = zero');
  {
    const deliberationDir = path.resolve(process.cwd(), 'src', 'core', 'deliberation');
    const files = fs.readdirSync(deliberationDir);
    const prohibitedTokens = ['screen_vision', 'visual_grounding', 'visual_localization', 'screenshot_processing'];

    let leakageDetected = false;
    for (const file of files) {
      const content = fs.readFileSync(path.resolve(deliberationDir, file), 'utf8');
      for (const token of prohibitedTokens) {
        if (content.toLowerCase().includes(token)) {
          leakageDetected = true;
          break;
        }
      }
    }
    expect(leakageDetected === false, 'Zero future-milestone vision leakage detected in MS-1.5.05');
  }

  // --------------------------------------------------------------------------
  // VECTOR 37: Protected workspace untouched
  // --------------------------------------------------------------------------
  console.log('[VECTOR 37] Protected workspace untouched');
  {
    const protectedPath = 'C:\\BOW\\shopofbow';
    const exists = fs.existsSync(protectedPath);
    expect(exists === false, `Protected workspace '${protectedPath}' exists: ${exists} (expected false)`);
  }

  cleanupTestDir();

  console.log('\n================================================================================');
  console.log(`SUITE #99 SUMMARY: ALL 37 VECTORS PASSED (${passedAssertions} total assertions clean)`);
  console.log('MS-1.5.05 NATIVE NEURO-SYMBOLIC DELIBERATION ENGINE: VERIFIED');
  console.log('================================================================================\n');
}

runRegressionSuite99().catch((err) => {
  console.error('[SUITE #99 FATAL ERROR]:', err);
  process.exit(1);
});
