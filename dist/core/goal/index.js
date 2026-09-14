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
// Component 1008: GoalTypes
export { 
// Constants & Bounds
GOAL_SCHEMA_VERSION, MAX_GOALS_PER_TENANT, MAX_SUBGOALS_PER_GOAL, MAX_GRAPH_DEPTH, MAX_EDGES_PER_GOAL, MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH, CANONICAL_PRIORITY_WEIGHTS, 
// Error Hierarchy
GoalError, GoalValidationError, GoalTransitionError, GoalGraphCycleError, GoalConcurrencyError, CrossTenantGoalError, GoalUserStopError, GoalCoTProhibitedError, GoalIntegrityError, GoalSecurityError, GoalCapacityError, 
// Security & Canonical Utilities
computeDeterministicGoalId, computeGoalHash, computeGraphProvenanceHash, } from './goalTypes.js';
// Component 1009: GoalValidator
export { GoalValidator, } from './goalValidator.js';
// Component 1010: GoalFormationEngine
export { GoalFormationEngine, } from './goalFormationEngine.js';
// Component 1011: GoalPriorityEngine
export { GoalPriorityEngine, globalGoalPriorityEngine, } from './goalPriorityEngine.js';
// Component 1012: PriorityGraphEngine
export { PriorityGraphEngine, } from './priorityGraphEngine.js';
// Component 1013: GoalConflictResolver
export { GoalConflictResolver, } from './goalConflictResolver.js';
// Component 1014: GoalLifecycleManager
export { GoalLifecycleManager, LEGAL_GOAL_TRANSITIONS, } from './goalLifecycleManager.js';
// Component 1015: GoalPersistenceEngine
export { GoalPersistenceEngine, globalGoalPersistenceEngine, } from './goalPersistenceEngine.js';
// Component 1016: GoalRecoveryEngine
export { GoalRecoveryEngine, globalGoalRecoveryEngine, } from './goalRecoveryEngine.js';
