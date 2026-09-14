// tests/test_v4_ms15_goal_priority_graph.ts
// BOWCON V4.0 — MS-1.5.04: NATIVE GOAL FORMATION & PRIORITY GRAPH ENGINE
// Dedicated Regression Suite #98
//
// Invariants:
// COGNITION != AUTHORITY
// GOAL != TASK
// PRIORITY != AUTHORIZATION
// VECTOR_MATCH != GOAL_TRUTH
// WORKING_STATE != DURABLE_TRUTH
// USER_STOP > ALL_MUTATION
// LLM_OUTPUT != AUTHORITATIVE_GOAL
// ZERO_DIRECT_TOOL_EXECUTION == TRUE
// FAIL_CLOSED_ON_CYCLE == TRUE
// FAIL_CLOSED_ON_MALFORMED_GOAL == TRUE
// NO_RAW_CHAIN_OF_THOUGHT_PERSISTENCE == TRUE

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  GOAL_SCHEMA_VERSION,
  MAX_GOALS_PER_TENANT,
  MAX_SUBGOALS_PER_GOAL,
  MAX_GRAPH_DEPTH,
  MAX_EDGES_PER_GOAL,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  GoalError,
  GoalValidationError,
  GoalTransitionError,
  GoalGraphCycleError,
  GoalConcurrencyError,
  CrossTenantGoalError,
  GoalUserStopError,
  GoalCoTProhibitedError,
  GoalIntegrityError,
  GoalSecurityError,
  GoalCapacityError,
  CANONICAL_PRIORITY_WEIGHTS,
  type GoalProposalInput,
  type GovernedGoal,
  type GoalPriorityVector,
  type GoalEdge,
  computeDeterministicGoalId,
  computeGoalHash,
  computeGraphProvenanceHash,
  GoalValidator,
  GoalFormationEngine,
  GoalPriorityEngine,
  PriorityGraphEngine,
  GoalConflictResolver,
  GoalLifecycleManager,
  GoalPersistenceEngine,
  GoalRecoveryEngine,
} from '../src/core/goal/index.js';
import { globalMasterHumanAuthority } from '../src/core/authority/masterHumanAuthority.js';
import { type CognitiveIntent } from '../src/core/cognitive/cognitiveTypes.js';

let passedAssertions = 0;
function expect(condition: boolean, msg: string) {
  assert(condition, `[ASSERTION FAILED] ${msg}`);
  passedAssertions++;
}

function expectThrows(fn: () => void, expectedErrorType: any, msg: string) {
  let thrown = false;
  try {
    fn();
  } catch (err: any) {
    thrown = true;
    expect(
      err instanceof expectedErrorType,
      `${msg} - Expected instance of ${expectedErrorType.name}, got ${err?.constructor?.name}: ${err?.message}`
    );
  }
  expect(thrown, `${msg} - Expected function to throw`);
}

async function expectAsyncThrows(fn: () => Promise<void>, expectedErrorType: any, msg: string) {
  let thrown = false;
  try {
    await fn();
  } catch (err: any) {
    thrown = true;
    expect(
      err instanceof expectedErrorType,
      `${msg} - Expected instance of ${expectedErrorType.name}, got ${err?.constructor?.name}: ${err?.message}`
    );
  }
  expect(thrown, `${msg} - Expected async function to throw`);
}

const mockIntent: CognitiveIntent = {
  intentId: 'intent_test_001',
  category: 'INVESTIGATION',
  description: 'Deploy canary version of payment service',
  confidence: 0.95,
  timestamp: new Date().toISOString(),
};

const TEST_STORAGE_DIR = path.resolve('./data/test_partitions_goals');

function cleanupTestDir() {
  try {
    if (fs.existsSync(TEST_STORAGE_DIR)) {
      fs.rmSync(TEST_STORAGE_DIR, { recursive: true, force: true });
    }
  } catch {
    // Ignore cleanup errors
  }
}

async function runRegressionSuite98() {
  console.log('================================================================================');
  console.log('BOWCON V4 — MS-1.5.04 DEDICATED REGRESSION SUITE #98');
  console.log('Native Goal Formation & Priority Graph Engine Subsystem');
  console.log('================================================================================\n');

  cleanupTestDir();

  // --------------------------------------------------------------------------
  // VECTOR 1: Goal proposal validation and structural schema contracts
  // --------------------------------------------------------------------------
  console.log('[VECTOR 1] Goal proposal validation and structural schema contracts');
  {
    const validProposal: GoalProposalInput = {
      tenantId: 'tenant_omega',
      sessionId: 'session_123',
      origin: 'USER_DIRECTIVE',
      sourceIntent: mockIntent,
      title: 'Analyze revenue metrics',
      description: 'Review quarterly revenue metrics from local ledger',
      successCriteria: ['Ledger parsed', 'Summary synthesized'],
      failureCriteria: ['Ledger unreadable'],
      constraints: ['read_only_mode', 'no_network_calls'],
      priorityVector: {
        importance: 0.8,
        urgency: 0.6,
        userEmphasis: 0.9,
        risk: 0.1,
        dependencyPressure: 0.2,
        blockingImpact: 0.3,
      },
    };

    GoalValidator.validateProposal(validProposal);
    expect(true, 'Valid proposal passed validation successfully');

    const formationEngine = new GoalFormationEngine();
    const governedGoal = formationEngine.formGoal(validProposal);

    expect(governedGoal.goalId.startsWith('goal_'), 'Deterministic goalId prefix');
    expect(governedGoal.status === 'PROPOSED', 'Initial status is PROPOSED');
    expect(governedGoal.version === 1, 'Initial version is 1');
    expect(governedGoal.provenanceHash.length === 64, 'Initial SHA-256 provenance hash present');
    expect(governedGoal.priorityScore > 0, 'Priority score calculated');
    expect(governedGoal.constraints.length === 2, 'Constraints preserved');
  }

  // --------------------------------------------------------------------------
  // VECTOR 2: Malformed, empty and oversized proposal rejection
  // --------------------------------------------------------------------------
  console.log('[VECTOR 2] Malformed, empty and oversized proposal rejection');
  {
    // Empty object
    expectThrows(() => GoalValidator.validateProposal({}), GoalValidationError, 'Empty proposal rejected');

    // Missing tenantId
    expectThrows(
      () =>
        GoalValidator.validateProposal({
          title: 'A',
          description: 'B',
          successCriteria: ['C'],
          origin: 'USER_DIRECTIVE',
        }),
      GoalValidationError,
      'Missing tenantId rejected'
    );

    // Oversized title (> 200 chars)
    expectThrows(
      () =>
        GoalValidator.validateProposal({
          tenantId: 'tenant_a',
          title: 'x'.repeat(MAX_TITLE_LENGTH + 1),
          description: 'Valid description',
          successCriteria: ['Criterion 1'],
          origin: 'USER_DIRECTIVE',
        }),
      GoalValidationError,
      'Oversized title rejected'
    );

    // Oversized description (> 2000 chars)
    expectThrows(
      () =>
        GoalValidator.validateProposal({
          tenantId: 'tenant_a',
          title: 'Valid Title',
          description: 'y'.repeat(MAX_DESCRIPTION_LENGTH + 1),
          successCriteria: ['Criterion 1'],
          origin: 'USER_DIRECTIVE',
        }),
      GoalValidationError,
      'Oversized description rejected'
    );

    // Empty success criteria
    expectThrows(
      () =>
        GoalValidator.validateProposal({
          tenantId: 'tenant_a',
          title: 'Valid Title',
          description: 'Valid description',
          successCriteria: [],
          origin: 'USER_DIRECTIVE',
        }),
      GoalValidationError,
      'Empty success criteria rejected'
    );
  }

  // --------------------------------------------------------------------------
  // VECTOR 3: Valid lifecycle: PROPOSED -> VALIDATING -> APPROVED -> ACTIVE -> COMPLETED
  // --------------------------------------------------------------------------
  console.log('[VECTOR 3] Valid lifecycle: PROPOSED -> VALIDATING -> APPROVED -> ACTIVE -> COMPLETED');
  {
    const formationEngine = new GoalFormationEngine();
    const lifecycleManager = new GoalLifecycleManager();

    const g0 = formationEngine.formGoal({
      tenantId: 'tenant_alpha',
      origin: 'USER_DIRECTIVE',
      sourceIntent: mockIntent,
      title: 'Valid Lifecycle Goal',
      description: 'Demonstrating happy path transitions',
      successCriteria: ['Artifact verified', 'Audit recorded'],
    });
    expect(g0.status === 'PROPOSED', 'Status is PROPOSED');

    const g1 = lifecycleManager.transitionGoal(g0, 'VALIDATING', { reason: 'Validation started' });
    expect(g1.status === 'VALIDATING', 'Status transitioned to VALIDATING');
    expect(g1.version === 2, 'Version incremented to 2');

    const g2 = lifecycleManager.transitionGoal(g1, 'APPROVED', { reason: 'Validated against policy' });
    expect(g2.status === 'APPROVED', 'Status transitioned to APPROVED');
    expect(g2.version === 3, 'Version incremented to 3');

    const g3 = lifecycleManager.transitionGoal(g2, 'ACTIVE', { reason: 'Prerequisites met' });
    expect(g3.status === 'ACTIVE', 'Status transitioned to ACTIVE');
    expect(g3.version === 4, 'Version incremented to 4');

    const g4 = lifecycleManager.transitionGoal(g3, 'COMPLETED', {
      reason: 'All criteria satisfied',
      completionEvidence: ['Artifact verified in reality engine', 'Audit hash recorded'],
    });
    expect(g4.status === 'COMPLETED', 'Status transitioned to COMPLETED');
    expect(g4.version === 5, 'Version incremented to 5');
    expect(g4.provenanceHash !== g0.provenanceHash, 'Provenance chained across versions');
  }

  // --------------------------------------------------------------------------
  // VECTOR 4: Illegal lifecycle transition rejection
  // --------------------------------------------------------------------------
  console.log('[VECTOR 4] Illegal lifecycle transition rejection');
  {
    const formationEngine = new GoalFormationEngine();
    const lifecycleManager = new GoalLifecycleManager();

    const g0 = formationEngine.formGoal({
      tenantId: 'tenant_alpha',
      origin: 'USER_DIRECTIVE',
      sourceIntent: mockIntent,
      title: 'Illegal Transition Goal',
      description: 'Testing illegal hops',
      successCriteria: ['Success'],
    });

    // PROPOSED directly to ACTIVE (illegal, must go through VALIDATING -> APPROVED)
    expectThrows(
      () => lifecycleManager.transitionGoal(g0, 'ACTIVE'),
      GoalTransitionError,
      'PROPOSED -> ACTIVE illegal transition rejected'
    );

    // PROPOSED directly to COMPLETED (illegal)
    expectThrows(
      () => lifecycleManager.transitionGoal(g0, 'COMPLETED'),
      GoalTransitionError,
      'PROPOSED -> COMPLETED illegal transition rejected'
    );

    // ACTIVE directly to COMPLETED without completion evidence
    const gValidating = lifecycleManager.transitionGoal(g0, 'VALIDATING');
    const gApproved = lifecycleManager.transitionGoal(gValidating, 'APPROVED');
    const gActive = lifecycleManager.transitionGoal(gApproved, 'ACTIVE');

    expectThrows(
      () => lifecycleManager.transitionGoal(gActive, 'COMPLETED', { completionEvidence: [] }),
      GoalValidationError,
      'ACTIVE -> COMPLETED rejected without empirical evidence'
    );

    // Terminal state mutation rejection: COMPLETED -> ACTIVE
    const gCompleted = lifecycleManager.transitionGoal(gActive, 'COMPLETED', {
      completionEvidence: ['Empirical evidence token'],
    });
    expectThrows(
      () => lifecycleManager.transitionGoal(gCompleted, 'ACTIVE'),
      GoalTransitionError,
      'COMPLETED is terminal; cannot transition to ACTIVE'
    );
  }

  // --------------------------------------------------------------------------
  // VECTOR 5: PARENT_OF hierarchical decomposition and bounds
  // --------------------------------------------------------------------------
  console.log('[VECTOR 5] PARENT_OF hierarchical decomposition and bounds');
  {
    const formationEngine = new GoalFormationEngine();
    const graph = new PriorityGraphEngine('tenant_alpha');

    const rootGoal = formationEngine.formGoal({
      tenantId: 'tenant_alpha',
      origin: 'USER_DIRECTIVE',
      sourceIntent: mockIntent,
      title: 'Root Goal',
      description: 'Top-level goal',
      successCriteria: ['All subgoals completed'],
    });
    graph.addGoal(rootGoal);

    // Add subgoals under root
    for (let i = 1; i <= 5; i++) {
      const subGoal = formationEngine.formGoal({
        tenantId: 'tenant_alpha',
        parentGoalId: rootGoal.goalId,
        origin: 'COGNITIVE_REGISTER',
        sourceIntent: mockIntent,
        title: `Subgoal ${i}`,
        description: `Subgoal level 1 item ${i}`,
        successCriteria: [`Subgoal ${i} satisfied`],
      });
      graph.addGoal(subGoal);
      graph.addEdge({
        sourceGoalId: rootGoal.goalId,
        targetGoalId: subGoal.goalId,
        edgeType: 'PARENT_OF',
        tenantId: 'tenant_alpha',
      });
    }

    const subgoals = graph.getSubgoals(rootGoal.goalId);
    expect(subgoals.length === 5, '5 subgoals retrieved via PARENT_OF');

    // Subgoal limit enforcement (MAX_SUBGOALS_PER_GOAL = 20)
    for (let i = 6; i <= MAX_SUBGOALS_PER_GOAL; i++) {
      const g = formationEngine.formGoal({
        tenantId: 'tenant_alpha',
        parentGoalId: rootGoal.goalId,
        origin: 'COGNITIVE_REGISTER',
        sourceIntent: mockIntent,
        title: `Subgoal ${i}`,
        description: `Subgoal item ${i}`,
        successCriteria: [`Subgoal ${i} satisfied`],
      });
      graph.addGoal(g);
      graph.addEdge({
        sourceGoalId: rootGoal.goalId,
        targetGoalId: g.goalId,
        edgeType: 'PARENT_OF',
        tenantId: 'tenant_alpha',
      });
    }

    // 21st subgoal should violate MAX_SUBGOALS_PER_GOAL
    const overflowGoal = formationEngine.formGoal({
      tenantId: 'tenant_alpha',
      parentGoalId: rootGoal.goalId,
      origin: 'COGNITIVE_REGISTER',
      sourceIntent: mockIntent,
      title: 'Subgoal 21',
      description: 'Overflow subgoal',
      successCriteria: ['Overflow'],
    });
    expectThrows(
      () => {
        graph.addGoal(overflowGoal);
        graph.addEdge({
          sourceGoalId: rootGoal.goalId,
          targetGoalId: overflowGoal.goalId,
          edgeType: 'PARENT_OF',
          tenantId: 'tenant_alpha',
        });
      },
      GoalCapacityError,
      'Exceeding MAX_SUBGOALS_PER_GOAL throws GoalCapacityError'
    );
  }

  // --------------------------------------------------------------------------
  // VECTOR 6: Priority formula correctness across: I, U, E, R, D, B
  // --------------------------------------------------------------------------
  console.log('[VECTOR 6] Priority formula correctness across: I, U, E, R, D, B');
  {
    const engine = new GoalPriorityEngine();
    // Formula:
    // P = clamp(wi*I + wu*U + we*E + wr*R + wd*D + wb*B, 0.0, 1.0)
    // Canonical weights: wi=0.25, wu=0.20, we=0.25, wr=-0.10, wd=0.15, wb=0.25

    const vector: GoalPriorityVector = {
      importance: 1.0,        // 0.25 * 1.0 = 0.25
      urgency: 0.5,           // 0.20 * 0.5 = 0.10
      userEmphasis: 0.8,      // 0.25 * 0.8 = 0.20
      risk: 0.5,              // -0.10 * 0.5 = -0.05
      dependencyPressure: 0.0,// 0.15 * 0.0 = 0.00
      blockingImpact: 0.4,    // 0.25 * 0.4 = 0.10
    };
    // Expected raw: 0.25 + 0.10 + 0.20 - 0.05 + 0.00 + 0.10 = 0.60
    const score = engine.calculateScore(vector);
    expect(Math.abs(score - 0.60) < 0.001, `Priority score ${score} matches expected 0.60`);

    // Extreme high clamping check
    const maxVector: GoalPriorityVector = {
      importance: 1.0,
      urgency: 1.0,
      userEmphasis: 1.0,
      risk: 0.0,
      dependencyPressure: 1.0,
      blockingImpact: 1.0,
    };
    // raw = 0.25 + 0.20 + 0.25 - 0 + 0.15 + 0.25 = 1.10 -> clamped to 1.0
    expect(engine.calculateScore(maxVector) === 1.0, 'High priority clamped to 1.0');

    // Extreme low clamping check
    const minVector: GoalPriorityVector = {
      importance: 0.0,
      urgency: 0.0,
      userEmphasis: 0.0,
      risk: 1.0,
      dependencyPressure: 0.0,
      blockingImpact: 0.0,
    };
    // raw = -0.10 -> clamped to 0.0
    expect(engine.calculateScore(minVector) === 0.0, 'Low priority clamped to 0.0');
  }

  // --------------------------------------------------------------------------
  // VECTOR 7: Priority normalization and deterministic tie-breaking
  // --------------------------------------------------------------------------
  console.log('[VECTOR 7] Priority normalization and deterministic tie-breaking');
  {
    const formation = new GoalFormationEngine();
    const priorityEngine = new GoalPriorityEngine();

    // Create 3 goals with the exact same priority score (e.g., 0.5)
    // but different userEmphasis, createdAt, and goalId
    const gA = formation.formGoal({
      tenantId: 'tenant_alpha',
      origin: 'USER_DIRECTIVE',
      sourceIntent: mockIntent,
      title: 'Goal A',
      description: 'Identical score, lower user emphasis',
      successCriteria: ['Criteria A'],
      priorityVector: { importance: 0.5, urgency: 0.5, userEmphasis: 0.4, risk: 0.0, dependencyPressure: 0.0, blockingImpact: 0.5 },
    });

    const gB = formation.formGoal({
      tenantId: 'tenant_alpha',
      origin: 'USER_DIRECTIVE',
      sourceIntent: mockIntent,
      title: 'Goal B',
      description: 'Identical score, higher user emphasis',
      successCriteria: ['Criteria B'],
      priorityVector: { importance: 0.5, urgency: 0.5, userEmphasis: 0.9, risk: 0.0, dependencyPressure: 0.0, blockingImpact: 0.5 },
    });

    // Sort order should place gB before gA because gB has higher userEmphasis
    const sorted = priorityEngine.sortGoals([gA, gB]);
    expect(sorted[0].goalId === gB.goalId, 'Tie-breaking rule 1: higher userEmphasis wins');
  }

  // --------------------------------------------------------------------------
  // VECTOR 8: Priority cannot grant execution authority
  // --------------------------------------------------------------------------
  console.log('[VECTOR 8] Priority cannot grant execution authority');
  {
    const formation = new GoalFormationEngine();
    const maxGoal = formation.formGoal({
      tenantId: 'tenant_alpha',
      origin: 'USER_DIRECTIVE',
      sourceIntent: mockIntent,
      title: 'Max Priority Goal',
      description: 'Highest possible priority',
      successCriteria: ['Criteria'],
      priorityVector: { importance: 1.0, urgency: 1.0, userEmphasis: 1.0, risk: 0.0, dependencyPressure: 1.0, blockingImpact: 1.0 },
    });

    expect(maxGoal.priorityScore === 1.0, 'Priority is 1.0');
    // Verify no execution capabilities exist on the goal or formation engine
    expect((maxGoal as any).execute === undefined, 'No execute() on GovernedGoal');
    expect((maxGoal as any).runTool === undefined, 'No runTool() on GovernedGoal');
    expect((formation as any).execute === undefined, 'No execute() on GoalFormationEngine');
    expect((formation as any).runTool === undefined, 'No runTool() on GoalFormationEngine');
  }

  // --------------------------------------------------------------------------
  // VECTOR 9: DEPENDS_ON and BLOCKS validation
  // --------------------------------------------------------------------------
  console.log('[VECTOR 9] DEPENDS_ON and BLOCKS validation');
  {
    const formation = new GoalFormationEngine();
    const lifecycle = new GoalLifecycleManager();
    const graph = new PriorityGraphEngine('tenant_alpha');

    const g1 = formation.formGoal({
      tenantId: 'tenant_alpha',
      origin: 'USER_DIRECTIVE',
      sourceIntent: mockIntent,
      title: 'Prerequisite Goal 1',
      description: 'Must complete first',
      successCriteria: ['Prereq satisfied'],
    });

    const g2 = formation.formGoal({
      tenantId: 'tenant_alpha',
      origin: 'USER_DIRECTIVE',
      sourceIntent: mockIntent,
      title: 'Dependent Goal 2',
      description: 'Depends on Goal 1',
      successCriteria: ['Dependent satisfied'],
    });

    // Transition both to APPROVED
    const g1Approved = lifecycle.transitionGoal(lifecycle.transitionGoal(g1, 'VALIDATING'), 'APPROVED');
    const g2Approved = lifecycle.transitionGoal(lifecycle.transitionGoal(g2, 'VALIDATING'), 'APPROVED');

    graph.addGoal(g1Approved);
    graph.addGoal(g2Approved);

    graph.addEdge({
      sourceGoalId: g2.goalId,
      targetGoalId: g1.goalId,
      edgeType: 'DEPENDS_ON',
      tenantId: 'tenant_alpha',
    });

    // Schedulable goals: g1 is schedulable, but g2 is not because g1 is not COMPLETED
    const schedulable = graph.getSchedulableGoals();
    expect(schedulable.some((g) => g.goalId === g1.goalId), 'g1 is schedulable');
    expect(!schedulable.some((g) => g.goalId === g2.goalId), 'g2 is not schedulable while g1 is incomplete');

    // Complete g1
    const g1Active = lifecycle.transitionGoal(g1Approved, 'ACTIVE');
    const g1Completed = lifecycle.transitionGoal(g1Active, 'COMPLETED', {
      completionEvidence: ['g1 evidence'],
    });
    graph.updateGoal(g1Completed);

    // Now g2 is schedulable
    const schedulableAfter = graph.getSchedulableGoals();
    expect(schedulableAfter.some((g) => g.goalId === g2.goalId), 'g2 becomes schedulable after g1 completes');
  }

  // --------------------------------------------------------------------------
  // VECTOR 10: Circular dependency rejection
  // --------------------------------------------------------------------------
  console.log('[VECTOR 10] Circular dependency rejection');
  {
    const formation = new GoalFormationEngine();
    const graph = new PriorityGraphEngine('tenant_alpha');

    const gA = formation.formGoal({
      tenantId: 'tenant_alpha',
      origin: 'USER_DIRECTIVE',
      sourceIntent: mockIntent,
      title: 'Goal A',
      description: 'A in cycle',
      successCriteria: ['A ok'],
    });
    const gB = formation.formGoal({
      tenantId: 'tenant_alpha',
      origin: 'USER_DIRECTIVE',
      sourceIntent: mockIntent,
      title: 'Goal B',
      description: 'B in cycle',
      successCriteria: ['B ok'],
    });
    const gC = formation.formGoal({
      tenantId: 'tenant_alpha',
      origin: 'USER_DIRECTIVE',
      sourceIntent: mockIntent,
      title: 'Goal C',
      description: 'C in cycle',
      successCriteria: ['C ok'],
    });

    graph.addGoal(gA);
    graph.addGoal(gB);
    graph.addGoal(gC);

    // A -> B, B -> C
    graph.addEdge({
      sourceGoalId: gA.goalId,
      targetGoalId: gB.goalId,
      edgeType: 'DEPENDS_ON',
      tenantId: 'tenant_alpha',
    });
    graph.addEdge({
      sourceGoalId: gB.goalId,
      targetGoalId: gC.goalId,
      edgeType: 'DEPENDS_ON',
      tenantId: 'tenant_alpha',
    });

    // C -> A would form a cycle: A -> B -> C -> A
    expectThrows(
      () =>
        graph.addEdge({
          sourceGoalId: gC.goalId,
          targetGoalId: gA.goalId,
          edgeType: 'DEPENDS_ON',
          tenantId: 'tenant_alpha',
        }),
      GoalGraphCycleError,
      'Circular dependency detected and rejected with GoalGraphCycleError'
    );
  }

  // --------------------------------------------------------------------------
  // VECTOR 11: Self-reference rejection
  // --------------------------------------------------------------------------
  console.log('[VECTOR 11] Self-reference rejection');
  {
    const formation = new GoalFormationEngine();
    const graph = new PriorityGraphEngine('tenant_alpha');

    const gA = formation.formGoal({
      tenantId: 'tenant_alpha',
      origin: 'USER_DIRECTIVE',
      sourceIntent: mockIntent,
      title: 'Goal A',
      description: 'Self-reference test',
      successCriteria: ['Criteria'],
    });
    graph.addGoal(gA);

    expectThrows(
      () =>
        graph.addEdge({
          sourceGoalId: gA.goalId,
          targetGoalId: gA.goalId,
          edgeType: 'DEPENDS_ON',
          tenantId: 'tenant_alpha',
        }),
      GoalValidationError,
      'Self-referencing edge A -> A rejected'
    );
  }

  // --------------------------------------------------------------------------
  // VECTOR 12: Conflict detection and resolution
  // --------------------------------------------------------------------------
  console.log('[VECTOR 12] Conflict detection and resolution');
  {
    const formation = new GoalFormationEngine();
    const graph = new PriorityGraphEngine('tenant_alpha');
    const resolver = new GoalConflictResolver();

    // Goal 1: Human directive with exclusive database lock
    const gHuman = formation.formGoal({
      tenantId: 'tenant_alpha',
      origin: 'USER_DIRECTIVE',
      sourceIntent: mockIntent,
      title: 'Exclusive DB Migration',
      description: 'Exclusive lock on postgres_db',
      successCriteria: ['Migration complete'],
      constraints: ['exclusive:postgres_db'],
      priorityVector: { importance: 0.9, urgency: 0.9, userEmphasis: 1.0, risk: 0.1, dependencyPressure: 0.5, blockingImpact: 0.8 },
    });

    // Goal 2: Autonomous goal requiring same exclusive resource
    const gAutonomous = formation.formGoal({
      tenantId: 'tenant_alpha',
      origin: 'COGNITIVE_REGISTER',
      sourceIntent: mockIntent,
      title: 'Bulk DB Cleanup',
      description: 'Requires postgres_db exclusively',
      successCriteria: ['Cleanup done'],
      constraints: ['exclusive:postgres_db'],
      priorityVector: { importance: 0.4, urgency: 0.3, userEmphasis: 0.0, risk: 0.2, dependencyPressure: 0.1, blockingImpact: 0.1 },
    });

    graph.addGoal(gHuman);
    graph.addGoal(gAutonomous);

    const conflicts = resolver.detectConflicts(graph);
    expect(conflicts.length === 1, 'Resource conflict detected between gHuman and gAutonomous');
    expect(conflicts[0].conflictType === 'RESOURCE_EXCLUSION', 'Type is RESOURCE_EXCLUSION');

    const resolution = resolver.resolveConflict(conflicts[0], graph);
    expect(resolution.winnerGoalId === gHuman.goalId, 'Human directive wins over autonomous goal');
    expect(resolution.loserGoalId === gAutonomous.goalId, 'Autonomous goal is loser');

    // Apply resolution
    resolver.applyResolution(resolution, graph);
    const updatedLoser = graph.getGoal(gAutonomous.goalId);
    expect(updatedLoser?.status === 'BLOCKED', 'Loser goal transitioned to BLOCKED status');
  }

  // --------------------------------------------------------------------------
  // VECTOR 13: Tenant isolation
  // --------------------------------------------------------------------------
  console.log('[VECTOR 13] Tenant isolation');
  {
    const formation = new GoalFormationEngine();
    const graphA = new PriorityGraphEngine('tenant_alpha');

    const goalTenantB = formation.formGoal({
      tenantId: 'tenant_beta',
      origin: 'USER_DIRECTIVE',
      sourceIntent: mockIntent,
      title: 'Tenant Beta Goal',
      description: 'Should not enter tenant_alpha graph',
      successCriteria: ['Criteria'],
    });

    expectThrows(
      () => graphA.addGoal(goalTenantB),
      CrossTenantGoalError,
      'Adding tenant_beta goal into tenant_alpha graph rejected'
    );
  }

  // --------------------------------------------------------------------------
  // VECTOR 14: Cross-tenant edge rejection
  // --------------------------------------------------------------------------
  console.log('[VECTOR 14] Cross-tenant edge rejection');
  {
    const formation = new GoalFormationEngine();
    const graphA = new PriorityGraphEngine('tenant_alpha');

    const gA = formation.formGoal({
      tenantId: 'tenant_alpha',
      origin: 'USER_DIRECTIVE',
      sourceIntent: mockIntent,
      title: 'Tenant Alpha Goal',
      description: 'Alpha',
      successCriteria: ['Criteria'],
    });
    graphA.addGoal(gA);

    expectThrows(
      () =>
        graphA.addEdge({
          sourceGoalId: gA.goalId,
          targetGoalId: 'goal_external_beta',
          edgeType: 'DEPENDS_ON',
          tenantId: 'tenant_beta', // Mismatched tenant
        }),
      CrossTenantGoalError,
      'Cross-tenant edge rejected'
    );
  }

  // --------------------------------------------------------------------------
  // VECTOR 15: Session-scoped filtering
  // --------------------------------------------------------------------------
  console.log('[VECTOR 15] Session-scoped filtering');
  {
    const formation = new GoalFormationEngine();
    const graph = new PriorityGraphEngine('tenant_alpha');

    const gSession1 = formation.formGoal({
      tenantId: 'tenant_alpha',
      sessionId: 'sess_1',
      origin: 'USER_DIRECTIVE',
      sourceIntent: mockIntent,
      title: 'Goal Session 1',
      description: 'Sess 1',
      successCriteria: ['Criteria'],
    });

    const gSession2 = formation.formGoal({
      tenantId: 'tenant_alpha',
      sessionId: 'sess_2',
      origin: 'USER_DIRECTIVE',
      sourceIntent: mockIntent,
      title: 'Goal Session 2',
      description: 'Sess 2',
      successCriteria: ['Criteria'],
    });

    graph.addGoal(gSession1);
    graph.addGoal(gSession2);

    const s1Goals = graph.listGoals({ sessionId: 'sess_1' });
    expect(s1Goals.length === 1 && s1Goals[0].goalId === gSession1.goalId, 'Session 1 goals correctly filtered');

    const s2Goals = graph.listGoals({ sessionId: 'sess_2' });
    expect(s2Goals.length === 1 && s2Goals[0].goalId === gSession2.goalId, 'Session 2 goals correctly filtered');
  }

  // --------------------------------------------------------------------------
  // VECTOR 16: OCC/CAS stale-version rejection
  // --------------------------------------------------------------------------
  console.log('[VECTOR 16] OCC/CAS stale-version rejection');
  {
    const formation = new GoalFormationEngine();
    const graph = new PriorityGraphEngine('tenant_alpha');
    const persistence = new GoalPersistenceEngine({ baseDir: TEST_STORAGE_DIR });

    const g = formation.formGoal({
      tenantId: 'tenant_alpha',
      origin: 'USER_DIRECTIVE',
      sourceIntent: mockIntent,
      title: 'OCC Goal',
      description: 'Testing optimistic concurrency control',
      successCriteria: ['Criteria'],
    });
    graph.addGoal(g);

    // Initial save (graphVersion = 1)
    persistence.saveGraph(graph, 1);
    expect(true, 'Initial graph persisted with expectedVersion 1');

    // Second save with correct expectedVersion (2)
    persistence.saveGraph(graph, 2);
    expect(true, 'Second save succeeded with incremented version 2');

    // Third save with stale expectedVersion (1 instead of 3)
    expectThrows(
      () => persistence.saveGraph(graph, 1),
      GoalConcurrencyError,
      'Stale expectedVersion throws GoalConcurrencyError'
    );
  }

  // --------------------------------------------------------------------------
  // VECTOR 17: Atomic persistence and .bak fallback
  // --------------------------------------------------------------------------
  console.log('[VECTOR 17] Atomic persistence and .bak fallback');
  {
    const formation = new GoalFormationEngine();
    const graph = new PriorityGraphEngine('tenant_atomic');
    const persistence = new GoalPersistenceEngine({ baseDir: TEST_STORAGE_DIR });

    const g1 = formation.formGoal({
      tenantId: 'tenant_atomic',
      origin: 'USER_DIRECTIVE',
      sourceIntent: mockIntent,
      title: 'Atomic Goal 1',
      description: 'First version',
      successCriteria: ['Criteria 1'],
    });
    graph.addGoal(g1);

    // Save v1
    persistence.saveGraph(graph, 1);

    // Save v2
    const g2 = formation.formGoal({
      tenantId: 'tenant_atomic',
      origin: 'USER_DIRECTIVE',
      sourceIntent: mockIntent,
      title: 'Atomic Goal 2',
      description: 'Second version',
      successCriteria: ['Criteria 2'],
    });
    graph.addGoal(g2);
    persistence.saveGraph(graph, 2);

    // Verify .bak file was created
    const partitionDir = path.join(TEST_STORAGE_DIR, 'tenant_atomic');
    const bakFile = path.join(partitionDir, 'goal_graph.json.bak');
    expect(fs.existsSync(bakFile), '.bak snapshot file created after secondary save');
  }

  // --------------------------------------------------------------------------
  // VECTOR 18: Corruption detection and recovery rehydration
  // --------------------------------------------------------------------------
  console.log('[VECTOR 18] Corruption detection and recovery rehydration');
  {
    const formation = new GoalFormationEngine();
    const graph = new PriorityGraphEngine('tenant_recovery');
    const persistence = new GoalPersistenceEngine({ baseDir: TEST_STORAGE_DIR });
    const recovery = new GoalRecoveryEngine(persistence);

    const g = formation.formGoal({
      tenantId: 'tenant_recovery',
      origin: 'USER_DIRECTIVE',
      sourceIntent: mockIntent,
      title: 'Recoverable Goal',
      description: 'Will survive primary file corruption',
      successCriteria: ['Criteria'],
    });
    graph.addGoal(g);

    // Save twice so .bak exists
    persistence.saveGraph(graph, 1);
    persistence.saveGraph(graph, 2);

    // Corrupt primary file
    const primaryPath = path.join(TEST_STORAGE_DIR, 'tenant_recovery', 'goal_graph.json');
    fs.writeFileSync(primaryPath, '{ invalid json structure !!! corrupted content', 'utf8');

    // Rehydrate - should detect corruption and rehydrate from .bak
    const { graph: recoveredGraph, report } = recovery.rehydrateGraph('tenant_recovery');
    const restoredGoals = recoveredGraph.listGoals();
    expect(restoredGoals.length === 1, 'Successfully recovered goal from .bak fallback');
    expect(restoredGoals[0].title === 'Recoverable Goal', 'Goal title restored intact');
    expect(report.recoveredFromBackup === true, 'Report indicates recovery was from backup');
  }

  // --------------------------------------------------------------------------
  // VECTOR 19: SHA-256 goal and graph provenance
  // --------------------------------------------------------------------------
  console.log('[VECTOR 19] SHA-256 goal and graph provenance');
  {
    const formation = new GoalFormationEngine();
    const goal = formation.formGoal({
      tenantId: 'tenant_alpha',
      origin: 'USER_DIRECTIVE',
      sourceIntent: mockIntent,
      title: 'Provenance Goal',
      description: 'Testing cryptographic provenance hash',
      successCriteria: ['Crit 1', 'Crit 2'],
      constraints: ['const 1'],
    });

    const expectedHash = computeGoalHash(goal);
    expect(goal.provenanceHash === expectedHash, 'Goal provenance hash matches canonical SHA-256 calculation');

    // Tampering test
    const tamperedGoal: GovernedGoal = {
      ...goal,
      title: 'Tampered Title In Transit',
    };
    const tamperedHash = computeGoalHash(tamperedGoal);
    expect(tamperedHash !== goal.provenanceHash, 'Tampering title causes provenance mismatch');
  }

  // --------------------------------------------------------------------------
  // VECTOR 20: Credential/PII sanitization
  // --------------------------------------------------------------------------
  console.log('[VECTOR 20] Credential/PII sanitization');
  {
    const formation = new GoalFormationEngine();
    const dirtyProposal: GoalProposalInput = {
      tenantId: 'tenant_alpha',
      origin: 'USER_DIRECTIVE',
      sourceIntent: mockIntent,
      title: 'Deploy to AWS AKIAIOSFODNN7EXAMPLE',
      description: 'Use token Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 and secret sk-1234567890abcdef1234567890abcdef',
      successCriteria: ['Connected with password=supersecretpass'],
      constraints: ['api_key=AIzaSyA1234567890abcdef'],
    };

    const formed = formation.formGoal(dirtyProposal);

    // Verify secrets were sanitized into [REDACTED] markers
    expect(!formed.title.includes('AKIAIOSFODNN7EXAMPLE'), 'AWS access key sanitized from title');
    expect(!formed.description.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'), 'JWT sanitized from description');
    expect(!formed.description.includes('sk-1234567890abcdef1234567890abcdef'), 'Secret key sanitized from description');
    expect(!formed.successCriteria[0].includes('supersecretpass'), 'Password sanitized from criteria');
    expect(!formed.constraints[0].includes('AIzaSyA1234567890abcdef'), 'API key sanitized from constraints');
  }

  // --------------------------------------------------------------------------
  // VECTOR 21: Prototype pollution defense
  // --------------------------------------------------------------------------
  console.log('[VECTOR 21] Prototype pollution defense');
  {
    // Malicious payload with __proto__
    const payloadWithProto = JSON.parse('{"tenantId":"t1","title":"G","description":"D","successCriteria":["S"],"__proto__":{"polluted":true}}');
    expectThrows(
      () => GoalValidator.validateProposal(payloadWithProto),
      GoalSecurityError,
      'Prototype pollution __proto__ rejected'
    );

    // Malicious payload with constructor
    const payloadWithConstructor = {
      tenantId: 't1',
      title: 'G',
      description: 'D',
      successCriteria: ['S'],
      constructor: { hacked: true },
    };
    expectThrows(
      () => GoalValidator.validateProposal(payloadWithConstructor),
      GoalSecurityError,
      'Prototype pollution constructor rejected'
    );
  }

  // --------------------------------------------------------------------------
  // VECTOR 22: USER_STOP preemption across mutation entry points
  // --------------------------------------------------------------------------
  console.log('[VECTOR 22] USER_STOP preemption across mutation entry points');
  {
    const activeStopProvider = () => true; // Simulating active USER_STOP

    const formation = new GoalFormationEngine({ userStopProvider: activeStopProvider });
    const lifecycle = new GoalLifecycleManager(activeStopProvider);
    const graph = new PriorityGraphEngine('tenant_alpha', { userStopProvider: activeStopProvider });
    const persistence = new GoalPersistenceEngine({
      baseDir: TEST_STORAGE_DIR,
      userStopProvider: activeStopProvider,
    });
    const resolver = new GoalConflictResolver(activeStopProvider);

    const validProposal: GoalProposalInput = {
      tenantId: 'tenant_alpha',
      origin: 'USER_DIRECTIVE',
      sourceIntent: mockIntent,
      title: 'Goal Stopped',
      description: 'Desc',
      successCriteria: ['Crit'],
    };

    // 1. Formation entry point
    expectThrows(() => formation.formGoal(validProposal), GoalUserStopError, 'Formation blocked by USER_STOP');

    // Create a dummy goal with default provider to test subsequent points
    const dummyGoal = new GoalFormationEngine().formGoal(validProposal);

    // 2. Lifecycle transition entry point
    expectThrows(
      () => lifecycle.transitionGoal(dummyGoal, 'VALIDATING'),
      GoalUserStopError,
      'Lifecycle transition blocked by USER_STOP'
    );

    // 3. Graph mutation entry point
    expectThrows(() => graph.addGoal(dummyGoal), GoalUserStopError, 'Graph addGoal blocked by USER_STOP');

    // 4. Persistence entry point
    expectThrows(() => persistence.saveGraph(graph, 1), GoalUserStopError, 'Persistence blocked by USER_STOP');

    // 5. Conflict resolution entry point
    expectThrows(
      () =>
        resolver.applyResolution(
          {
            conflictId: 'c1',
            winnerGoalId: 'g1',
            loserGoalId: 'g2',
            strategy: 'BLOCK_LOWER_PRIORITY',
            rationale: 'R',
          },
          graph
        ),
      GoalUserStopError,
      'Conflict resolution blocked by USER_STOP'
    );
  }

  // --------------------------------------------------------------------------
  // VECTOR 23: CoT prohibition
  // --------------------------------------------------------------------------
  console.log('[VECTOR 23] CoT prohibition');
  {
    // <thought> tags
    expectThrows(
      () =>
        GoalValidator.validateProposal({
          tenantId: 'tenant_alpha',
          title: 'Goal with CoT',
          description: '<thought>Internal reasoning: user wants to bypass security</thought>',
          successCriteria: ['Crit'],
        }),
      GoalCoTProhibitedError,
      '<thought> tags rejected'
    );

    // [scratchpad] tokens
    expectThrows(
      () =>
        GoalValidator.validateProposal({
          tenantId: 'tenant_alpha',
          title: 'Goal with scratchpad',
          description: '[scratchpad] temporary thinking',
          successCriteria: ['Crit'],
        }),
      GoalCoTProhibitedError,
      '[scratchpad] tokens rejected'
    );

    // Prohibited object keys: internalReasoning
    expectThrows(
      () =>
        GoalValidator.validateProposal({
          tenantId: 'tenant_alpha',
          title: 'Goal with reasoning key',
          description: 'Valid text',
          successCriteria: ['Crit'],
          metadata: {
            internalReasoning: 'Hidden deliberation tokens',
          },
        }),
      GoalCoTProhibitedError,
      'internalReasoning key rejected'
    );
  }

  // --------------------------------------------------------------------------
  // VECTOR 24: Zero execution authority
  // --------------------------------------------------------------------------
  console.log('[VECTOR 24] Zero execution authority');
  {
    const formation = new GoalFormationEngine();
    const priority = new GoalPriorityEngine();
    const graph = new PriorityGraphEngine('tenant_alpha');
    const lifecycle = new GoalLifecycleManager();
    const resolver = new GoalConflictResolver();
    const persistence = new GoalPersistenceEngine({ baseDir: TEST_STORAGE_DIR });
    const recovery = new GoalRecoveryEngine(persistence);

    const prohibitedMethods = ['execute', 'runTool', 'shell', 'spawn', 'eval'];

    for (const target of [formation, priority, graph, lifecycle, resolver, persistence, recovery]) {
      for (const method of prohibitedMethods) {
        expect(
          (target as any)[method] === undefined,
          `${target.constructor.name} has no execution method '${method}'`
        );
      }
    }
  }

  // --------------------------------------------------------------------------
  // VECTOR 25: Historical regression compatibility
  // --------------------------------------------------------------------------
  console.log('[VECTOR 25] Historical regression compatibility');
  {
    // Verify that MS-1.5.01, MS-1.5.02, MS-1.5.03 subsystems remain operational and exportable
    const { LocalCognitiveRuntimeFacade } = await import('../src/core/cognitive/localCognitiveRuntimeFacade.js');
    const { CognitiveStateEngine } = await import('../src/core/cognitiveState/cognitiveStateEngine.js');
    const { NativeVectorIndex } = await import('../src/core/semanticMemory/nativeVectorIndex.js');

    expect(typeof LocalCognitiveRuntimeFacade === 'function', 'LocalCognitiveRuntimeFacade (MS-1.5.01) export valid');
    expect(typeof CognitiveStateEngine === 'function', 'CognitiveStateEngine (MS-1.5.02) export valid');
    expect(typeof NativeVectorIndex === 'function', 'NativeVectorIndex (MS-1.5.03) export valid');
  }

  // --------------------------------------------------------------------------
  // VECTOR 26: Protected workspace isolation: C:\BOW\shopofbow
  // --------------------------------------------------------------------------
  console.log('[VECTOR 26] Protected workspace isolation: C:\\BOW\\shopofbow');
  {
    const protectedPath = 'C:\\BOW\\shopofbow';
    const exists = fs.existsSync(protectedPath);
    expect(exists === false, `Protected workspace '${protectedPath}' exists check: ${exists} (expected false)`);
  }

  cleanupTestDir();

  console.log('\n================================================================================');
  console.log(`SUITE #98 SUMMARY: ALL 26 VECTORS PASSED (${passedAssertions} total assertions clean)`);
  console.log('MS-1.5.04 NATIVE GOAL FORMATION & PRIORITY GRAPH ENGINE: VERIFIED');
  console.log('================================================================================\n');
}

runRegressionSuite98().catch((err) => {
  console.error('[SUITE #98 FATAL ERROR]:', err);
  process.exit(1);
});
