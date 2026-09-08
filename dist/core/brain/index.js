// src/core/brain/index.ts
// BOWCON V4.0 — MS-1.3.30: BRAIN RUNTIME PUBLIC BARREL EXPORT
//
// Only intentionally public API is exported here.
// Internal implementation details remain private to src/core/brain/.
// Types & constants
export { BRAIN_SUBSYSTEM_VERSION, BRAIN_ID_PREFIX, BRAIN_TASK_ID_PREFIX, BRAIN_MAX_ITERATIONS_PER_TASK, BRAIN_MAX_RECOVERY_DEPTH, BRAIN_MAX_RETRY_ATTEMPTS, BRAIN_TASK_DEFAULT_DEADLINE_MS, BRAIN_TOOL_EXECUTION_TIMEOUT_MS, BRAIN_LLM_TIMEOUT_MS, makeBrainId, makeBrainTaskId, BRAIN_TASK_TERMINAL_STATUSES, BRAIN_TASK_ACTIVE_STATUSES, isBrainTaskTerminal, isBrainTaskActive, appendBrainAuditEvent, } from './brainTypes.js';
// State taxonomy
export { ALL_BRAIN_STATES, BRAIN_TERMINAL_STATES, BRAIN_RESTING_STATES, BRAIN_ACTIVE_EXECUTION_STATES, isBrainTerminal, isBrainResting, isBrainActivelyExecuting, canBrainAcceptInput, } from './brainStates.js';
// Transitions
export { BRAIN_TRANSITIONS, isValidBrainTransition, assertValidBrainTransition, } from './brainTransitions.js';
// Errors
export { BrainError, sanitizeBrainErrorMessage, } from './brainFailure.js';
// Task
export { BrainTask } from './brainTask.js';
// Model Provider
export { DeterministicBrainModelProvider, OllamaModelProvider, createBrainModelProvider, } from './brainModelProvider.js';
// Tools
export { ALL_BRAIN_TOOLS, brainFsWriteTool, brainFsReadTool, brainFsAppendTool, brainFsListTool, brainFsDeleteTool, brainEchoTool, verifyFileExists, readFileContent, EXECUTION_WORKSPACE, BRAIN_DATA_DIR, } from './brainTools.js';
// Brain Loop
export { BrainLoop, DEFAULT_BRAIN_LOOP_CONFIG, } from './brainLoop.js';
// Brain Runtime (master orchestrator)
export { BrainRuntime, getBrainRuntime, setBrainRuntimeForTest, } from './brainRuntime.js';
