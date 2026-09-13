// src/core/agentLoopFacade/index.ts
// BOWCON V4.0 — MS-1.4.10: PRODUCTION AGENT LOOP FAÇADE MODULE INDEX
//
// EN:
// Canonical public exports for the Production Agent Loop Façade subsystem.
// Exposes types, constants, errors, execution gate, state coordinator,
// retry governor, subsystem composer, and the master ProductionAgentLoopFacade.
//
// VI:
// Điểm xuất module công khai chuẩn hóa cho phân hệ Mặt tiền Chu trình Agent Sản xuất.

export {
  AGENT_LOOP_FACADE_VERSION,
  AGENT_LOOP_FACADE_AUDIT_DOMAIN,
  MAX_LOOP_ITERATIONS,
  MAX_STEP_ATTEMPTS,
  MAX_CONSECUTIVE_DENIALS,
  MAX_TASK_EXECUTION_TIME_MS,
  AGENT_LOOP_BOUNDS,
  type AgentLoopState,
  type AgentLoopOutcomeStatus,
  type AgentLoopContext,
  type AgentLoopRequest,
  type AgentLoopStepExecution,
  type AgentLoopResult,
  type AgentLoopAuditEventType,
  AgentLoopError,
  AgentLoopAbortedError,
  AgentLoopValidationError,
  AgentLoopSecurityViolationError,
  AgentLoopConcurrencyError,
  AgentLoopBudgetExceededError,
  AgentLoopAuthorizationError,
  AgentLoopExecutionError,
} from './agentLoopFacadeTypes.js';

export {
  AgentLoopExecutionGate,
  globalAgentLoopExecutionGate,
  type AgentLoopGateContext,
  type AgentLoopExecutionGateOptions,
} from './agentLoopExecutionGate.js';

export {
  AgentLoopStateCoordinator,
  type StateTransitionEvent,
} from './agentLoopStateCoordinator.js';

export {
  AgentLoopRetryGovernor,
  type RetryGovernorOptions,
} from './agentLoopRetryGovernor.js';

export {
  AgentLoopSubsystemComposer,
  type AgentLoopSubsystemComposerOptions,
} from './agentLoopSubsystemComposer.js';

export {
  ProductionAgentLoopFacade,
  globalProductionAgentLoopFacade,
  type ProductionAgentLoopFacadeOptions,
} from './productionAgentLoopFacade.js';
