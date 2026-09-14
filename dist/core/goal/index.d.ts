/**
 * BOWCON V4 - Component 1017: GoalModuleIndex
 * MS-1.5.04: Native Goal Formation & Priority Graph Engine Subsystem
 *
 * Public barrel export for the Native Goal Formation and Priority Graph Engine.
 * Provides typed domain models, validators, formation, priority calculation,
 * priority graph DAG with cycle detection, conflict resolution, lifecycle management,
 * atomic persistence, and deterministic recovery.
 *
 * STRICT BOUNDARY:
 * - Pure data, validation, graph, priority, and state-management subsystem only.
 * - Zero tool execution authority (no execute, runTool, shell, spawn, or eval).
 * - COGNITION != AUTHORITY
 * - GOAL != TASK
 * - PRIORITY != AUTHORIZATION
 * - USER_STOP > ALL MUTATION
 */
export { GOAL_SCHEMA_VERSION, MAX_GOALS_PER_TENANT, MAX_SUBGOALS_PER_GOAL, MAX_GRAPH_DEPTH, MAX_EDGES_PER_GOAL, MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH, type GoalOrigin, type GoalStatus, type GovernedGoalStatus, type GoalEdgeType, type GoalConflictType, type GoalPriorityVector, type GoalPriorityWeights, CANONICAL_PRIORITY_WEIGHTS, type GoalProposalInput, type GovernedGoal, type GoalEdge, type GoalConflictDescriptor, type GoalGraphDocument, GoalError, GoalValidationError, GoalTransitionError, GoalGraphCycleError, GoalConcurrencyError, CrossTenantGoalError, GoalUserStopError, GoalCoTProhibitedError, GoalIntegrityError, GoalSecurityError, GoalCapacityError, computeDeterministicGoalId, computeGoalHash, computeGraphProvenanceHash, } from './goalTypes.js';
export { GoalValidator, } from './goalValidator.js';
export { GoalFormationEngine, type GoalFormationOptions, } from './goalFormationEngine.js';
export { GoalPriorityEngine, globalGoalPriorityEngine, } from './goalPriorityEngine.js';
export { PriorityGraphEngine, type PriorityGraphEngineOptions, } from './priorityGraphEngine.js';
export { GoalConflictResolver, } from './goalConflictResolver.js';
export { GoalLifecycleManager, LEGAL_GOAL_TRANSITIONS, } from './goalLifecycleManager.js';
export { GoalPersistenceEngine, type GoalPersistenceOptions, globalGoalPersistenceEngine, } from './goalPersistenceEngine.js';
export { GoalRecoveryEngine, type GoalRecoveryReport, globalGoalRecoveryEngine, } from './goalRecoveryEngine.js';
