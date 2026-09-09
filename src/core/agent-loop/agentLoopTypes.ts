// src/core/agent-loop/agentLoopTypes.ts
// BOWCON V4.0 — MS-1.3.36: REAL BOWCON CONTINUOUS AGENT OPERATING LOOP & CONTROLLED AUTONOMY RUNTIME
//
// Canonical Contracts and Schemas for Continuous Controlled Operating Loop.
//
// INVARIANTS:
// LLM_PROPOSE != EXECUTE
// CONFIDENCE != AUTHORIZATION
// DETECTION != DIAGNOSIS
// DIAGNOSIS != AUTHORIZATION
// AUTHORIZATION != SUCCESS
// EXECUTION != VERIFICATION
// VERIFICATION != COMMIT
// FAILURE != BRAIN_DEATH
// AUTONOMOUS_EXECUTION != USER_AUTHORITY
// USER_STOP > EVERYTHING

import type { RecoveryClass } from '../supervisor/supervisorTypes.js';
import type { ActionRiskLevel } from '../world-action/worldActionTypes.js';
import type { AuthorizationToken } from '../world-action/worldActionTypes.js';

export type ContinuousLoopState =
  | 'BOOTING'
  | 'SELF_CHECK'
  | 'READY'
  | 'OBSERVING'
  | 'STATE_RECONSTRUCTION'
  | 'REASONING'
  | 'PLANNING'
  | 'GOVERNANCE_CHECK'
  | 'WAITING_FOR_AUTHORIZATION'
  | 'AUTHORIZED'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'EVALUATING'
  | 'RECOVERING'
  | 'ESCALATING'
  | 'PAUSED'
  | 'STOPPING'
  | 'STOPPED'
  | 'FAILED';

export type ControlledAgentLoopState = ContinuousLoopState;
export type AgentLoopState = ContinuousLoopState;

export type ObjectivePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ObjectiveStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'BLOCKED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface AgentLoopObjective {
  readonly objectiveId: string;
  readonly title: string;
  readonly description: string;
  readonly targetResource?: string;
  readonly priority: ObjectivePriority;
  readonly status: ObjectiveStatus;
  readonly createdTimestamp: number;
  readonly updatedTimestamp: number;
  readonly completedTimestamp?: number;
  readonly metadata?: Record<string, any>;
}

export interface AgentLoopObservation {
  readonly observationId: string;
  readonly timestamp: number;
  readonly host: {
    readonly platform: string;
    readonly cores: number;
    readonly freeMemMb: number;
    readonly totalMemMb: number;
  };
  readonly process: {
    readonly pid: number;
    readonly memoryRssMb: number;
    readonly uptimeSeconds: number;
  };
  readonly capabilities: {
    readonly total: number;
    readonly available: number;
    readonly degraded: number;
    readonly unavailable: number;
  };
  readonly cognitive: {
    readonly providerType: string;
    readonly isAvailable: boolean;
    readonly isFallbackActive: boolean;
  };
  readonly worldAction: {
    readonly pendingCount: number;
    readonly isEmergencyStop: boolean;
  };
  readonly supervisor: {
    readonly state: string;
    readonly isSafeStopActive: boolean;
    readonly activeAnomaliesCount: number;
  };
  readonly activeObjectiveId?: string;
}

export interface AgentLoopDecision {
  readonly decisionId: string;
  readonly objectiveId: string;
  readonly actionRequired: boolean;
  readonly rationale: string;
  readonly proposedCapability?: string;
  readonly parameters?: Record<string, any>;
  readonly confidence: number;
  readonly targetResource?: string;
}

export interface AgentLoopPlanStep {
  readonly stepIndex: number;
  readonly description: string;
  readonly capabilityId: string;
  readonly target?: string;
  readonly parameters: Record<string, any>;
  readonly isReversible: boolean;
}

export interface AgentLoopPlan {
  readonly planId: string;
  readonly objectiveId: string;
  readonly decisionId: string;
  readonly steps: readonly AgentLoopPlanStep[];
  readonly recoveryClass: RecoveryClass;
  readonly requiresHumanGate: boolean;
  readonly riskLevel: ActionRiskLevel;
  readonly timeoutMs: number;
  readonly maxAttempts: number;
  readonly createdTimestamp: number;
}

export type AuthorizationState = 'NOT_REQUIRED' | 'PENDING' | 'GRANTED' | 'DENIED' | 'CANCELLED';

export interface AgentLoopIteration {
  readonly iterationId: string;
  readonly traceId: string;
  readonly sessionId: string;
  readonly objectiveId?: string;
  readonly iterationNumber: number;
  readonly state: AgentLoopState;
  readonly observationRef?: string;
  readonly decisionRef?: string;
  readonly planRef?: string;
  readonly authorizationState: AuthorizationState;
  readonly executionState?: 'SKIPPED' | 'EXECUTED' | 'FAILED' | 'BLOCKED';
  readonly verificationState?: 'PASSED' | 'FAILED' | 'SKIPPED';
  readonly outcome?: AgentLoopOutcome;
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface AgentLoopOutcome {
  readonly outcomeId: string;
  readonly planId: string;
  readonly success: boolean;
  readonly verified: boolean;
  readonly durationMs: number;
  readonly error?: string;
  readonly escalation?: any;
}

export type ControlCommandType =
  | 'USER_COMMAND'
  | 'USER_APPROVE'
  | 'USER_DENY'
  | 'USER_STOP'
  | 'USER_PAUSE'
  | 'USER_RESUME'
  | 'USER_RESET';

export interface AgentLoopControlCommand {
  readonly commandId: string;
  readonly type: ControlCommandType;
  readonly operatorId: string;
  readonly timestamp: number;
  readonly payload?: Record<string, any>;
}

export interface AgentLoopHealth {
  readonly state: AgentLoopState;
  readonly isAutonomousExecutionAllowed: boolean;
  readonly isPaused: boolean;
  readonly isStopped: boolean;
  readonly activeObjectiveId?: string;
  readonly currentIteration: number;
  readonly consecutiveFailures: number;
  readonly totalIterations: number;
  readonly uptimeSeconds: number;
}

export interface AgentLoopCheckpoint {
  readonly checkpointId: string;
  readonly timestamp: number;
  readonly state: AgentLoopState;
  readonly objective?: AgentLoopObjective;
  readonly session: string;
  readonly iteration: number;
  readonly lastObservation?: AgentLoopObservation;
  readonly lastDecision?: AgentLoopDecision;
  readonly lastPlan?: AgentLoopPlan;
  readonly authorizationState: AuthorizationState;
  readonly verificationState?: string;
  readonly recoveryAttempts: number;
  readonly checkpointHash: string;
}

export type LoopFailureCode =
  | 'INITIALIZATION_FAILED'
  | 'SELF_CHECK_FAILED'
  | 'OBSERVATION_FAILED'
  | 'REASONING_FAILED'
  | 'PLANNING_FAILED'
  | 'GOVERNANCE_DENIED'
  | 'AUTHORIZATION_DENIED'
  | 'AUTHORIZATION_TIMEOUT'
  | 'EXECUTION_FAILED'
  | 'VERIFICATION_FAILED'
  | 'RECOVERY_EXHAUSTED'
  | 'USER_STOP_TRIGGERED'
  | 'STALE_STATE_DETECTED'
  | 'RESOURCE_LOCK_CONFLICT'
  | 'CORRUPTED_CHECKPOINT'
  | 'INTERNAL_ERROR';

export interface AgentLoopFailure {
  readonly code: LoopFailureCode;
  readonly message: string;
  readonly timestamp: number;
  readonly iterationId?: string;
  readonly details?: Record<string, any>;
}
