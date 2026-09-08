// src/core/brain/brainTypes.ts
// BOWCON V4.0 — MS-1.3.30: REAL BOWCON BRAIN RUNTIME FOUNDATION
//
// Canonical types, constants, and invariants for the Brain Runtime.
//
// INVARIANTS:
// BRAIN != LLM           — LLM is a cognitive component, not the brain itself
// BRAIN != SESSION        — Brain persists beyond individual sessions
// BRAIN != DEVICE         — Brain identity != device identity
// BRAIN != SURFACE        — Desktop/Mobile/Robot are surfaces, not brain
// TASK_ID != SESSION_ID   — Task IDs are independent from session IDs
// TASK_ID != BRAIN_ID     — Task IDs are independent from brain IDs
// EXECUTION != VERIFIED   — A successful tool call != verified result
// RECONNECT != RE-EXECUTE — Network reconnect never re-executes tasks
// LLM_PROPOSE != EXECUTE  — LLM proposals require deterministic approval

import { randomBytes } from 'node:crypto';

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------
export const BRAIN_SUBSYSTEM_VERSION = '4.0.0';
export const BRAIN_ID_PREFIX = 'brain';
export const BRAIN_TASK_ID_PREFIX = 'task';

// ---------------------------------------------------------------------------
// Limits & Timeouts
// ---------------------------------------------------------------------------
export const BRAIN_MAX_ITERATIONS_PER_TASK = 10;
export const BRAIN_MAX_RECOVERY_DEPTH = 3;
export const BRAIN_MAX_RETRY_ATTEMPTS = 3;
export const BRAIN_TASK_DEFAULT_DEADLINE_MS = 60_000; // 60 seconds
export const BRAIN_IDLE_TIMEOUT_MS = 300_000; // 5 minutes
export const BRAIN_TOOL_EXECUTION_TIMEOUT_MS = 30_000;
export const BRAIN_LLM_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Brain Identity
// ---------------------------------------------------------------------------
export type BrainId = string & { readonly __brand: 'BrainId' };

export function makeBrainId(seed: string): BrainId {
  const hash = randomBytes(8).toString('hex');
  return `${BRAIN_ID_PREFIX}_${seed.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${hash}` as BrainId;
}

// ---------------------------------------------------------------------------
// Task Identity
// ---------------------------------------------------------------------------
export type BrainTaskId = string & { readonly __brand: 'BrainTaskId' };

export function makeBrainTaskId(): BrainTaskId {
  const ts = Date.now().toString(36);
  const rand = randomBytes(6).toString('hex');
  return `${BRAIN_TASK_ID_PREFIX}_${ts}_${rand}` as BrainTaskId;
}

// ---------------------------------------------------------------------------
// Risk & Priority
// ---------------------------------------------------------------------------
export type BrainTaskRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type BrainTaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

// ---------------------------------------------------------------------------
// Task Status
// ---------------------------------------------------------------------------
export type BrainTaskStatus =
  | 'PENDING'
  | 'UNDERSTANDING'
  | 'REASONING'
  | 'PLANNING'
  | 'DECIDING'
  | 'ACTION_PREPARING'
  | 'EXECUTING'
  | 'OBSERVING'
  | 'VERIFYING'
  | 'COMMITTING'
  | 'COMPLETED'
  | 'RECOVERING'
  | 'REPLANNING'
  | 'PAUSED'
  | 'CANCELLING'
  | 'CANCELLED'
  | 'FAILED';

export const BRAIN_TASK_TERMINAL_STATUSES: readonly BrainTaskStatus[] = Object.freeze([
  'COMPLETED', 'CANCELLED', 'FAILED',
]);

export const BRAIN_TASK_ACTIVE_STATUSES: readonly BrainTaskStatus[] = Object.freeze([
  'UNDERSTANDING', 'REASONING', 'PLANNING', 'DECIDING',
  'ACTION_PREPARING', 'EXECUTING', 'OBSERVING', 'VERIFYING',
  'COMMITTING',
]);

export function isBrainTaskTerminal(status: BrainTaskStatus): boolean {
  return (BRAIN_TASK_TERMINAL_STATUSES as string[]).includes(status);
}

export function isBrainTaskActive(status: BrainTaskStatus): boolean {
  return (BRAIN_TASK_ACTIVE_STATUSES as string[]).includes(status);
}

// ---------------------------------------------------------------------------
// Verification Status
// ---------------------------------------------------------------------------
export type BrainVerificationStatus =
  | 'UNVERIFIED'
  | 'VERIFYING'
  | 'VERIFIED'
  | 'VERIFICATION_FAILED';

// ---------------------------------------------------------------------------
// Commit State
// ---------------------------------------------------------------------------
export type BrainCommitState =
  | 'UNCOMMITTED'
  | 'COMMITTING'
  | 'COMMITTED'
  | 'COMMIT_FAILED';

// ---------------------------------------------------------------------------
// Brain Plan
// ---------------------------------------------------------------------------
export interface BrainPlanStep {
  readonly stepId: string;
  readonly order: number;
  readonly description: string;
  readonly toolName: string;
  readonly toolArgs: Record<string, unknown>;
  readonly isCompleted: boolean;
  readonly skipped: boolean;
}

export interface BrainPlan {
  readonly planId: string;
  readonly taskId: BrainTaskId;
  readonly createdAt: number;
  readonly reasoning: string;
  readonly steps: readonly BrainPlanStep[];
  readonly revision: number;
}

// ---------------------------------------------------------------------------
// Tool Execution Record
// ---------------------------------------------------------------------------
export interface BrainToolExecutionRecord {
  readonly executionId: string;
  readonly taskId: BrainTaskId;
  readonly toolName: string;
  readonly args: Record<string, unknown>;
  readonly startedAt: number;
  readonly completedAt?: number;
  readonly rawResult?: unknown;
  readonly succeeded: boolean;
  readonly errorMessage?: string;
}

// ---------------------------------------------------------------------------
// Observation
// ---------------------------------------------------------------------------
export interface BrainObservation {
  readonly observationId: string;
  readonly taskId: BrainTaskId;
  readonly toolName: string;
  readonly observedAt: number;
  readonly expectedConditions: readonly string[];
  readonly actualConditions: readonly string[];
  readonly allMet: boolean;
  readonly notes?: string;
}

// ---------------------------------------------------------------------------
// Verification Record
// ---------------------------------------------------------------------------
export interface BrainVerificationRecord {
  readonly verificationId: string;
  readonly taskId: BrainTaskId;
  readonly status: BrainVerificationStatus;
  readonly verifiedAt: number;
  readonly passed: boolean;
  readonly evidence: readonly string[];
  readonly failureReason?: string;
}

// ---------------------------------------------------------------------------
// Task Failure
// ---------------------------------------------------------------------------
export interface BrainTaskFailure {
  readonly code: string;
  readonly message: string;
  readonly occurredAt: number;
  readonly step?: string;
  readonly recoverable: boolean;
}

// ---------------------------------------------------------------------------
// Task Result
// ---------------------------------------------------------------------------
export interface BrainTaskResult {
  readonly taskId: BrainTaskId;
  readonly success: boolean;
  readonly summary: string;
  readonly data?: unknown;
  readonly verificationStatus: BrainVerificationStatus;
  readonly completedAt: number;
  readonly totalDurationMs: number;
  readonly iterationCount: number;
}

// ---------------------------------------------------------------------------
// Recovery Decision
// ---------------------------------------------------------------------------
export interface BrainRecoveryDecision {
  readonly shouldRecover: boolean;
  readonly recoveryAction: 'REPLAN' | 'RETRY_STEP' | 'ABORT' | 'ESCALATE';
  readonly reason: string;
  readonly newPlanRequired: boolean;
}

// ---------------------------------------------------------------------------
// LLM Provider Output (proposals only — not execution authority)
// ---------------------------------------------------------------------------
export interface BrainModelOutput {
  readonly understanding: string;
  readonly reasoning: string;
  readonly proposedToolName: string;
  readonly proposedToolArgs: Record<string, unknown>;
  readonly planSummary: string;
  readonly confidence: number; // 0.0 – 1.0
  readonly requiresConfirmation: boolean;
}

// ---------------------------------------------------------------------------
// Brain Audit Event
// ---------------------------------------------------------------------------
export type BrainAuditEventType =
  | 'BRAIN_STARTED'
  | 'BRAIN_STOPPED'
  | 'TASK_CREATED'
  | 'TASK_STATUS_CHANGED'
  | 'UNDERSTANDING_COMPLETED'
  | 'REASONING_COMPLETED'
  | 'PLAN_CREATED'
  | 'DECISION_MADE'
  | 'ACTION_REQUESTED'
  | 'ACTION_EXECUTED'
  | 'OBSERVATION_RECEIVED'
  | 'VERIFICATION_STARTED'
  | 'VERIFICATION_COMPLETED'
  | 'RECOVERY_STARTED'
  | 'REPLAN_CREATED'
  | 'COMMIT_COMPLETED'
  | 'TASK_COMPLETED'
  | 'TASK_FAILED'
  | 'TASK_CANCELLED'
  | 'TASK_PAUSED'
  | 'TASK_RESUMED';

export interface BrainAuditEvent {
  readonly type: BrainAuditEventType;
  readonly taskId?: BrainTaskId;
  readonly brainId: BrainId;
  readonly timestamp: number;
  readonly data?: Record<string, unknown>;
}

export interface BrainAuditLedger {
  events: BrainAuditEvent[];
}

export function appendBrainAuditEvent(
  ledger: BrainAuditLedger,
  event: Omit<BrainAuditEvent, 'timestamp'> & { timestamp?: number }
): void {
  ledger.events.push({
    ...event,
    timestamp: event.timestamp ?? Date.now(),
  } as BrainAuditEvent);
}

// ---------------------------------------------------------------------------
// Brain Metrics
// ---------------------------------------------------------------------------
export interface BrainMetrics {
  totalTasksCreated: number;
  totalTasksCompleted: number;
  totalTasksFailed: number;
  totalTasksCancelled: number;
  totalToolExecutions: number;
  totalVerifications: number;
  totalRecoveries: number;
  totalIterations: number;
  uptimeMs: number;
  startedAt: number;
}
