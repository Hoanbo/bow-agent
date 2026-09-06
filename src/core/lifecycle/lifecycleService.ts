// src/core/lifecycle/lifecycleService.ts
// BOWCON V4.0 — MILESTONE 1.3.13: AUTHORITATIVE AGENT LIFECYCLE SERVICE
//
// EN:
// Central coordinator managing deterministic agent lifecycle states, transitions,
// checkpoints, and failure/recovery metadata scoped per user and session.
// Enforces all lifecycle invariants INV-STATE-01 through INV-STATE-15.
//
// VI:
// Bộ điều phối trung tâm quản lý các trạng thái vòng đời agent tất định, chuyển đổi trạng thái,
// checkpoint và metadata lỗi/phục hồi được phân vùng theo người dùng và phiên.
// Thực thi toàn bộ các quy tắc bất biến vòng đời từ INV-STATE-01 đến INV-STATE-15.

import type { PlanRiskLevel } from '../planning/planningTypes.js';
import type {
  AgentLifecycleState,
  FailureCategory,
  FailureMetadata,
  LifecycleCheckpoint,
  LifecycleState,
  RecoveryMetadata,
  TransitionRecord,
} from './lifecycleTypes.js';
import { mapStateToStage } from './lifecycleStates.js';
import { assertValidTransition } from './lifecycleTransitions.js';
import {
  computeStateFingerprint,
  computeTransitionFingerprint,
} from './lifecycleFingerprint.js';
import { createFailureMetadata } from './lifecycleFailure.js';
import { createRecoveryMetadata } from './lifecycleRecovery.js';
import { createLifecycleCheckpoint } from './lifecycleCheckpoint.js';
import {
  validateScope,
  validateSafeMetadata,
  assertRiskPreservation,
  assertGovernancePreservation,
  redactLifecycleSecrets,
} from './lifecycleValidator.js';

export interface TransitionOptions {
  readonly correlationId?: string;
  readonly decisionId?: string;
  readonly executionId?: string;
  readonly riskLevel?: PlanRiskLevel | string;
  readonly governanceRequired?: boolean;
  readonly approvalRequired?: boolean;
  readonly failure?: FailureMetadata;
  readonly recovery?: RecoveryMetadata;
  readonly safeMetadata?: Readonly<Record<string, unknown>>;
  readonly timestamp?: number;
}

interface SessionContext {
  currentState: AgentLifecycleState;
  transitions: TransitionRecord[];
  checkpoints: LifecycleCheckpoint[];
}

export class LifecycleService {
  // Scoped per ${userId}::${sessionId} ensuring zero cross-user/session leakage (INV-STATE-03)
  private readonly sessions = new Map<string, SessionContext>();

  private getSessionKey(userId: string, sessionId: string): string {
    return `${userId}::${sessionId}`;
  }

  /**
   * EN: Initializes or retrieves the lifecycle state for a given user and session.
   * VI: Khởi tạo hoặc lấy trạng thái vòng đời cho người dùng và phiên nhất định.
   */
  public getOrCreateSession(
    userId: string,
    sessionId: string,
    initialState: LifecycleState = 'READY',
    options: TransitionOptions = {},
  ): AgentLifecycleState {
    const scopeValidation = validateScope(userId, sessionId);
    if (!scopeValidation.valid) {
      throw new Error(scopeValidation.error);
    }

    const key = this.getSessionKey(userId, sessionId);
    const existing = this.sessions.get(key);
    if (existing) {
      return existing.currentState;
    }

    const metaValidation = validateSafeMetadata(options.safeMetadata);
    if (!metaValidation.valid) {
      throw new Error(metaValidation.error);
    }

    const sequence = 1;
    const stage = mapStateToStage(initialState);
    const fingerprint = computeStateFingerprint(
      userId,
      sessionId,
      initialState,
      sequence,
      options.riskLevel ? String(options.riskLevel) : undefined,
      options.correlationId,
    );

    const state: AgentLifecycleState = Object.freeze({
      stateId: `state_${fingerprint.replace(/^state_/, '')}`,
      userId,
      sessionId,
      currentState: initialState,
      stage,
      sequence,
      transitionReason: 'INITIAL_SESSION_CREATION',
      timestamp: options.timestamp || 0,
      correlationId: options.correlationId,
      decisionId: options.decisionId,
      executionId: options.executionId,
      riskLevel: options.riskLevel || 'LOW',
      governanceRequired: Boolean(options.governanceRequired),
      approvalRequired: Boolean(options.approvalRequired),
      safeMetadata: options.safeMetadata ? Object.freeze({ ...options.safeMetadata }) : Object.freeze({}),
      version: '4.0.0',
      fingerprint,
    });

    const initialTransition: TransitionRecord = Object.freeze({
      transitionId: `tr_${fingerprint.replace(/^state_/, '')}`,
      userId,
      sessionId,
      from: 'INITIALIZING',
      to: initialState,
      stage,
      sequence,
      reason: 'SESSION_INITIALIZED',
      timestamp: options.timestamp || 0,
      fingerprint: computeTransitionFingerprint(userId, sessionId, 'INITIALIZING', initialState, sequence, 'SESSION_INITIALIZED'),
      safeMetadata: options.safeMetadata ? Object.freeze({ ...options.safeMetadata }) : undefined,
    });

    this.sessions.set(key, {
      currentState: state,
      transitions: [initialTransition],
      checkpoints: [],
    });

    return state;
  }

  /**
   * EN: Retrieves the active lifecycle state snapshot for a session.
   * VI: Lấy snapshot trạng thái vòng đời hoạt động cho một phiên.
   */
  public getState(userId: string, sessionId: string): AgentLifecycleState {
    const scopeValidation = validateScope(userId, sessionId);
    if (!scopeValidation.valid) {
      throw new Error(scopeValidation.error);
    }

    const key = this.getSessionKey(userId, sessionId);
    const session = this.sessions.get(key);
    if (!session) {
      return this.getOrCreateSession(userId, sessionId);
    }

    return session.currentState;
  }

  /**
   * EN: Authoritatively validates and executes a state transition.
   * VI: Xác thực có thẩm quyền và thực thi một bước chuyển trạng thái.
   */
  public transition(
    userId: string,
    sessionId: string,
    to: LifecycleState,
    reason: string,
    options: TransitionOptions = {},
  ): AgentLifecycleState {
    const scopeValidation = validateScope(userId, sessionId);
    if (!scopeValidation.valid) {
      throw new Error(scopeValidation.error);
    }

    const metaValidation = validateSafeMetadata(options.safeMetadata);
    if (!metaValidation.valid) {
      throw new Error(metaValidation.error);
    }

    const key = this.getSessionKey(userId, sessionId);
    const session = this.sessions.get(key) || {
      currentState: this.getOrCreateSession(userId, sessionId),
      transitions: [],
      checkpoints: [],
    };

    const current = session.currentState;
    const from = current.currentState;

    // 1. Enforce Transition Matrix (INV-STATE-01, INV-STATE-05, INV-STATE-06)
    assertValidTransition(from, to, reason);

    // 2. Enforce Monotonic Risk Preservation (INV-STATE-07)
    assertRiskPreservation(current.riskLevel, options.riskLevel);

    // 3. Enforce Monotonic Governance Preservation (INV-STATE-08, INV-STATE-09)
    assertGovernancePreservation(
      current.governanceRequired,
      options.governanceRequired,
      current.approvalRequired,
      options.approvalRequired,
    );

    const nextSequence = current.sequence + 1;
    const nextStage = mapStateToStage(to);
    const sanitizedReason = redactLifecycleSecrets(reason || 'STATE_TRANSITION');

    // Effective risk & governance carry forward if not explicitly specified
    const effectiveRisk = options.riskLevel || current.riskLevel || 'LOW';
    const effectiveGov = options.governanceRequired !== undefined
      ? Boolean(options.governanceRequired)
      : Boolean(current.governanceRequired);
    const effectiveAppr = options.approvalRequired !== undefined
      ? Boolean(options.approvalRequired)
      : Boolean(current.approvalRequired);

    const nextFingerprint = computeStateFingerprint(
      userId,
      sessionId,
      to,
      nextSequence,
      String(effectiveRisk),
      options.correlationId || current.correlationId,
    );

    const transitionFingerprint = computeTransitionFingerprint(
      userId,
      sessionId,
      from,
      to,
      nextSequence,
      sanitizedReason,
    );

    const record: TransitionRecord = Object.freeze({
      transitionId: `tr_${transitionFingerprint.replace(/^transition_/, '')}`,
      userId,
      sessionId,
      from,
      to,
      stage: nextStage,
      sequence: nextSequence,
      reason: sanitizedReason,
      timestamp: options.timestamp || 0,
      fingerprint: transitionFingerprint,
      safeMetadata: options.safeMetadata ? Object.freeze({ ...options.safeMetadata }) : undefined,
    });

    const nextState: AgentLifecycleState = Object.freeze({
      stateId: `state_${nextFingerprint.replace(/^state_/, '')}`,
      userId,
      sessionId,
      currentState: to,
      previousState: from,
      stage: nextStage,
      sequence: nextSequence,
      transitionReason: sanitizedReason,
      timestamp: options.timestamp || 0,
      correlationId: options.correlationId || current.correlationId,
      decisionId: options.decisionId || current.decisionId,
      executionId: options.executionId || current.executionId,
      checkpointId: current.checkpointId,
      riskLevel: effectiveRisk,
      governanceRequired: effectiveGov,
      approvalRequired: effectiveAppr,
      failure: options.failure || current.failure,
      recovery: options.recovery || current.recovery,
      safeMetadata: options.safeMetadata ? Object.freeze({ ...options.safeMetadata }) : current.safeMetadata,
      version: '4.0.0',
      fingerprint: nextFingerprint,
    });

    session.currentState = nextState;
    session.transitions.push(record);
    this.sessions.set(key, session);

    return nextState;
  }

  /**
   * EN: Creates and stores an immutable lifecycle checkpoint snapshot.
   * VI: Tạo và lưu trữ một snapshot checkpoint vòng đời bất biến.
   */
  public createCheckpoint(
    userId: string,
    sessionId: string,
    correlationId?: string,
    safeMetadata?: Readonly<Record<string, unknown>>,
  ): LifecycleCheckpoint {
    const current = this.getState(userId, sessionId);
    const checkpoint = createLifecycleCheckpoint({
      userId,
      sessionId,
      state: current.currentState,
      stage: current.stage,
      sequence: current.sequence,
      correlationId: correlationId || current.correlationId,
      decisionId: current.decisionId,
      executionId: current.executionId,
      timestamp: current.timestamp,
      safeMetadata: safeMetadata || current.safeMetadata,
    });

    const key = this.getSessionKey(userId, sessionId);
    const session = this.sessions.get(key);
    if (session) {
      session.checkpoints.push(checkpoint);
      // Associate checkpoint identity with current state snapshot immutably
      session.currentState = Object.freeze({
        ...session.currentState,
        checkpointId: checkpoint.checkpointId,
      });
    }

    return checkpoint;
  }

  /**
   * EN: Records a structured failure and transitions lifecycle state accordingly.
   * VI: Ghi nhận một sự cố có cấu trúc và chuyển đổi trạng thái vòng đời tương ứng.
   */
  public recordFailure(
    userId: string,
    sessionId: string,
    message: string,
    category: FailureCategory = 'INTERNAL_FAILURE',
    recoverable = false,
    details: Readonly<Record<string, unknown>> = {},
  ): AgentLifecycleState {
    const current = this.getState(userId, sessionId);
    const failure = createFailureMetadata({
      userId,
      sessionId,
      category,
      message,
      recoverable,
      stage: current.stage,
      state: current.currentState,
      timestamp: current.timestamp,
      details,
    });

    const targetState: LifecycleState = recoverable ? 'RECOVERABLE' : 'FAILED';
    return this.transition(
      userId,
      sessionId,
      targetState,
      `FAILURE_RECORDED: [${category}] ${failure.message}`,
      { failure },
    );
  }

  /**
   * EN: Creates a data-only recovery descriptor attached to current lifecycle state.
   * VI: Tạo một bộ mô tả phục hồi thuần dữ liệu gắn vào trạng thái vòng đời hiện tại.
   */
  public createRecoveryDescriptor(
    userId: string,
    sessionId: string,
    recoveryState: LifecycleState,
    retryReason?: string,
    maxAttempts = 3,
  ): AgentLifecycleState {
    const current = this.getState(userId, sessionId);
    const recovery = createRecoveryMetadata({
      userId,
      sessionId,
      recoverable: true,
      failedState: current.currentState,
      recoveryState,
      attemptNumber: current.recovery ? current.recovery.attemptNumber + 1 : 1,
      maxAttempts,
      retryReason,
      previousFingerprint: current.fingerprint,
    });

    return this.transition(
      userId,
      sessionId,
      'RECOVERY_PENDING',
      `RECOVERY_PREPARED: transitioning to ${recoveryState}`,
      { recovery },
    );
  }

  /**
   * EN: Returns an immutable copy of all transition records for a session.
   * VI: Trả về bản sao bất biến của tất cả các bản ghi chuyển đổi cho một phiên.
   */
  public getTransitionHistory(userId: string, sessionId: string): readonly TransitionRecord[] {
    const key = this.getSessionKey(userId, sessionId);
    const session = this.sessions.get(key);
    if (!session) return Object.freeze([]);
    return Object.freeze([...session.transitions]);
  }

  /**
   * EN: Returns an immutable copy of all checkpoints for a session.
   * VI: Trả về bản sao bất biến của tất cả các checkpoint cho một phiên.
   */
  public getCheckpoints(userId: string, sessionId: string): readonly LifecycleCheckpoint[] {
    const key = this.getSessionKey(userId, sessionId);
    const session = this.sessions.get(key);
    if (!session) return Object.freeze([]);
    return Object.freeze([...session.checkpoints]);
  }
}
