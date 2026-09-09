// src/core/supervisor/supervisorRuntime.ts
// BOWCON V4.0 — MS-1.3.35: REAL BOWCON SUPERVISORY AUTONOMOUS RECOVERY & HUMAN GOVERNANCE RUNTIME
//
// Master Supervisor Runtime Orchestrator.
//
// INVARIANTS:
// LLM_PROPOSE != EXECUTE
// CONFIDENCE != AUTHORIZATION
// DETECTION != DIAGNOSIS
// DIAGNOSIS != AUTHORIZATION
// AUTHORIZATION != SUCCESS
// VERIFICATION != COMMIT
// FAILURE != BRAIN_DEATH
// USER_STOP > AUTONOMOUS_EXECUTION

import process from 'node:process';
import type {
  SupervisorRuntimeState,
  SupervisorHealth,
  ObservationSnapshot,
  Anomaly,
  Diagnosis,
  RecoveryPlan,
  HumanGateRequest,
  EscalationRecord,
} from './supervisorTypes.js';
import { assertValidSupervisorTransition } from './supervisorTransitions.js';
import { SupervisorError } from './supervisorFailure.js';
import { globalSupervisorObservation } from './supervisorObservation.js';
import { globalSupervisorAnomalyDetector } from './supervisorAnomalyDetector.js';
import { globalSupervisorDiagnosis } from './supervisorDiagnosis.js';
import { globalSupervisorRecoveryPlanner } from './supervisorRecoveryPlanner.js';
import { globalSupervisorRecoveryPolicy } from './supervisorRecoveryPolicy.js';
import { globalSupervisorHumanGate } from './supervisorHumanGate.js';
import { globalSupervisorExecution } from './supervisorExecution.js';
import { globalSupervisorVerifier } from './supervisorVerifier.js';
import { globalSupervisorEscalation } from './supervisorEscalation.js';
import { globalSupervisorAudit } from './supervisorAudit.js';
import { globalWorldActionAuth } from '../world-action/worldActionAuthorization.js';

export class SupervisorRuntime {
  private _state: SupervisorRuntimeState = 'INITIALIZING';
  private _safeStop: boolean = false;
  private _safeStopReason?: string;
  private _activeAnomalies: Anomaly[] = [];
  private _activeDiagnoses = new Map<string, Diagnosis>();
  private _activePlans = new Map<string, RecoveryPlan>();
  private _totalRecoveriesAttempted = 0;
  private _totalRecoveriesSucceeded = 0;
  private _totalRecoveriesFailed = 0;
  private _startTime = Date.now();

  constructor() {
    this.transitionTo('OBSERVING', 'System initialization completed');
  }

  // -------------------------------------------------------------------------
  // 1. State Management & Invariants
  // -------------------------------------------------------------------------

  public getCurrentState(): SupervisorRuntimeState {
    return this._state;
  }

  private transitionTo(newState: SupervisorRuntimeState, context?: string): void {
    assertValidSupervisorTransition(this._state, newState, context);
    this._state = newState;
  }

  // -------------------------------------------------------------------------
  // 2. SAFE_STOP (USER_STOP > AUTONOMOUS_EXECUTION)
  // -------------------------------------------------------------------------

  public activateSafeStop(reason: string): void {
    this._safeStop = true;
    this._safeStopReason = reason;
    this.transitionTo('SAFE_STOP', reason);
    globalSupervisorHumanGate.cancelAllBySafeStop();
    globalSupervisorAudit.record('SAFE_STOP', { reason });
  }

  public triggerSafeStop(reason: string): void {
    this.activateSafeStop(reason);
  }

  public resetSafeStop(operatorToken: string): void {
    if (!operatorToken || typeof operatorToken !== 'string') {
      throw new SupervisorError(
        'AUTHORIZATION_REQUIRED',
        'Valid operator token required to reset supervisor SAFE_STOP.'
      );
    }
    this._safeStop = false;
    this._safeStopReason = undefined;
    this.transitionTo('OBSERVING', 'Operator reset SAFE_STOP');
    globalSupervisorAudit.record('OPERATOR_RESET', { operatorToken });
  }

  public isSafeStopActive(): boolean {
    return this._safeStop;
  }

  // -------------------------------------------------------------------------
  // 3. Operational Cycle: Observe -> Detect -> Diagnose -> Plan
  // -------------------------------------------------------------------------

  public observe(): ObservationSnapshot {
    if (this._safeStop) {
      throw new SupervisorError(
        'SAFE_STOP_TRIGGERED',
        `Operation blocked: SAFE_STOP is active (${this._safeStopReason}).`
      );
    }

    this.transitionTo('OBSERVING', 'Initiating periodic observation');
    const snapshot = globalSupervisorObservation.captureSnapshot();
    globalSupervisorAudit.record('OBSERVATION_RECORDED', {
      cores: snapshot.host.cores,
      freeMemMb: snapshot.host.freeMemMb,
      capabilities: snapshot.capabilities,
    });

    const anomalies = globalSupervisorAnomalyDetector.detectAnomalies(snapshot);
    if (anomalies.length === 0) {
      this.transitionTo('HEALTHY', 'No anomalies detected');
    } else {
      this._activeAnomalies = anomalies;
      this.transitionTo('ANOMALY_DETECTED', `${anomalies.length} anomaly detected`);
      for (const a of anomalies) {
        globalSupervisorAudit.record('ANOMALY_DETECTED', {
          anomalyId: a.anomalyId,
          type: a.type,
          severity: a.severity,
        });
      }
    }

    return snapshot;
  }

  public getActiveAnomalies(): readonly Anomaly[] {
    return this._activeAnomalies;
  }

  public diagnose(anomaly: Anomaly): Diagnosis {
    if (this._safeStop) {
      throw new SupervisorError('SAFE_STOP_TRIGGERED', 'Cannot diagnose: SAFE_STOP is active.');
    }

    this.transitionTo('DIAGNOSING', `Diagnosing anomaly ${anomaly.anomalyId}`);
    const diagnosis = globalSupervisorDiagnosis.diagnose(anomaly);
    this._activeDiagnoses.set(diagnosis.diagnosisId, diagnosis);
    globalSupervisorAudit.record('DIAGNOSIS_CREATED', {
      diagnosisId: diagnosis.diagnosisId,
      anomalyId: anomaly.anomalyId,
      probableCause: diagnosis.probableCause,
      recoverability: diagnosis.recoverability,
    });
    return diagnosis;
  }

  public planRecovery(diagnosis: Diagnosis): RecoveryPlan {
    if (this._safeStop) {
      throw new SupervisorError('SAFE_STOP_TRIGGERED', 'Cannot plan: SAFE_STOP is active.');
    }

    this.transitionTo('RECOVERY_PLANNING', `Planning recovery for diagnosis ${diagnosis.diagnosisId}`);
    const plan = globalSupervisorRecoveryPlanner.planRecovery(diagnosis);
    this._activePlans.set(plan.planId, plan);
    globalSupervisorAudit.record('RECOVERY_PLANNED', {
      planId: plan.planId,
      diagnosisId: diagnosis.diagnosisId,
      recoveryClass: plan.recoveryClass,
      stepsCount: plan.steps.length,
    });
    return plan;
  }

  // -------------------------------------------------------------------------
  // 4. Governance & Human Gate
  // -------------------------------------------------------------------------

  public requestHumanApproval(
    diagnosis: Diagnosis,
    plan: RecoveryPlan,
    options?: { target?: string; affectedResources?: string[] }
  ): HumanGateRequest {
    if (this._safeStop) {
      throw new SupervisorError('SAFE_STOP_TRIGGERED', 'Cannot request approval: SAFE_STOP is active.');
    }

    this.transitionTo('WAITING_FOR_HUMAN', `Awaiting human authorization for plan ${plan.planId}`);
    const gateReq = globalSupervisorHumanGate.createRequest(diagnosis, plan, options);
    globalSupervisorAudit.record('HUMAN_GATE_CREATED', {
      requestId: gateReq.requestId,
      planId: plan.planId,
      riskLevel: plan.riskLevel,
    });
    return gateReq;
  }

  public approveRecovery(
    requestId: string,
    operatorId: string,
    context?: { deviceId?: string }
  ): HumanGateRequest {
    if (this._safeStop) {
      throw new SupervisorError('SAFE_STOP_TRIGGERED', 'Cannot approve: SAFE_STOP is active.');
    }

    const gateReq = globalSupervisorHumanGate.approve(requestId, operatorId, context);
    this.transitionTo('AUTHORIZED', `Human authorization granted by ${operatorId}`);
    globalSupervisorAudit.record('AUTHORIZATION_RECEIVED', {
      requestId,
      operatorId,
      tokenId: gateReq.authorizationToken?.tokenId,
    });
    return gateReq;
  }

  public denyRecovery(requestId: string, reason: string): HumanGateRequest {
    const gateReq = globalSupervisorHumanGate.deny(requestId, reason);
    globalSupervisorAudit.record('AUTHORIZATION_DENIED', { requestId, reason });
    this.transitionTo('HEALTHY', 'Recovery denied by operator; zero mutation committed');
    return gateReq;
  }

  // -------------------------------------------------------------------------
  // 5. Governed Execution, Verification & Resume
  // -------------------------------------------------------------------------

  public async executeRecovery(
    plan: RecoveryPlan,
    diagnosis: Diagnosis,
    options?: { isDryRun?: boolean; authorizationToken?: any }
  ): Promise<{ success: boolean; verified: boolean; error?: string; escalation?: EscalationRecord }> {
    // 1. Mandatory SAFE_STOP Check (USER_STOP > AUTONOMOUS_EXECUTION)
    if (this._safeStop) {
      throw new SupervisorError(
        'SAFE_STOP_TRIGGERED',
        `Autonomous execution prohibited: SAFE_STOP is active (${this._safeStopReason}).`
      );
    }

    // 2. Policy Check
    this.transitionTo('POLICY_EVALUATION', `Evaluating policy for plan ${plan.planId}`);
    const policyDecision = globalSupervisorRecoveryPolicy.evaluate(plan);
    globalSupervisorAudit.record('POLICY_EVALUATED', {
      planId: plan.planId,
      allowed: policyDecision.allowed,
      requiresHumanGate: policyDecision.requiresHumanGate,
    });

    if (policyDecision.requiresHumanGate && !options?.authorizationToken && !options?.isDryRun) {
      throw new SupervisorError(
        'AUTHORIZATION_REQUIRED',
        `Recovery plan "${plan.planId}" requires explicit human authorization token.`
      );
    }

    if (options?.authorizationToken) {
      const firstStep = plan.steps[0];
      const valResult = globalWorldActionAuth.validateToken(options.authorizationToken, {
        actionId: options.authorizationToken.actionId,
        actionType: firstStep?.capabilityId || 'supervisor_recovery',
        target: firstStep?.target || 'supervisor_target',
        parameters: firstStep?.parameters || {},
        userId: options.authorizationToken.userId,
        deviceId: options.authorizationToken.deviceId,
        sessionToken: 's',
      } as any);

      if (!valResult.valid) {
        throw new SupervisorError(
          'AUTHORIZATION_REQUIRED',
          `Authorization token invalid: ${valResult.reason}`
        );
      }
    }

    // 3. Retry Bounding & Escalation Check
    if (globalSupervisorEscalation.shouldEscalate(plan)) {
      const esc = globalSupervisorEscalation.escalate(
        plan,
        diagnosis,
        `Exceeded maximum recovery retry limit (${plan.maxAttempts}).`
      );
      this.transitionTo('ESCALATED', `Plan ${plan.planId} escalated after retry exhaustion`);
      globalSupervisorAudit.record('ESCALATED', { escalationId: esc.escalationId, planId: plan.planId });
      return { success: false, verified: false, error: esc.reason, escalation: esc };
    }

    // 4. Execution
    this.transitionTo('RECOVERING', `Executing recovery plan ${plan.planId}`);
    this._totalRecoveriesAttempted++;
    globalSupervisorAudit.record('RECOVERY_STARTED', { planId: plan.planId, isDryRun: options?.isDryRun });

    const execRes = await globalSupervisorExecution.executeRecovery(plan, options);
    if (!execRes.success) {
      this._totalRecoveriesFailed++;
      globalSupervisorEscalation.recordAttempt(plan.planId, {
        attemptIndex: globalSupervisorEscalation.getAttempts(plan.planId).length + 1,
        startedAt: Date.now(),
        completedAt: Date.now(),
        status: 'FAILED',
        error: execRes.error,
        verificationPassed: false,
      });
      this.transitionTo('RECOVERY_FAILED', `Execution failed: ${execRes.error}`);
      globalSupervisorAudit.record('RECOVERY_FAILED', { planId: plan.planId, error: execRes.error });
      return { success: false, verified: false, error: execRes.error };
    }

    // 5. Independent Verification (EXECUTION != VERIFICATION)
    this.transitionTo('VERIFYING', `Independently verifying plan ${plan.planId}`);
    const verifRes = await globalSupervisorVerifier.verifyRecovery(plan, diagnosis, options);
    if (!verifRes.verified) {
      this._totalRecoveriesFailed++;
      globalSupervisorEscalation.recordAttempt(plan.planId, {
        attemptIndex: globalSupervisorEscalation.getAttempts(plan.planId).length + 1,
        startedAt: Date.now(),
        completedAt: Date.now(),
        status: 'FAILED',
        error: verifRes.failureReason,
        verificationPassed: false,
      });
      this.transitionTo('RECOVERY_FAILED', `Verification failed: ${verifRes.failureReason}`);
      globalSupervisorAudit.record('RECOVERY_FAILED', {
        planId: plan.planId,
        reason: verifRes.failureReason,
      });
      return { success: true, verified: false, error: verifRes.failureReason };
    }

    // 6. Recovery Succeeded & Resume
    this._totalRecoveriesSucceeded++;
    this._activeAnomalies = this._activeAnomalies.filter(a => a.anomalyId !== diagnosis.anomalyId);
    this.transitionTo('RECOVERY_SUCCEEDED', `Plan ${plan.planId} verified successfully`);
    globalSupervisorAudit.record('RECOVERY_VERIFIED', {
      planId: plan.planId,
      checks: verifRes.checksPerformed,
    });

    this.transitionTo('HEALTHY', 'Resumed healthy operation after verified recovery');
    globalSupervisorAudit.record('RUNTIME_RESUME', { planId: plan.planId });

    return { success: true, verified: true };
  }

  // -------------------------------------------------------------------------
  // 6. Observability & Health
  // -------------------------------------------------------------------------

  public getHealth(): SupervisorHealth {
    return {
      state: this._state,
      isSafeStopActive: this._safeStop,
      activeAnomaliesCount: this._activeAnomalies.length,
      pendingHumanGatesCount: globalSupervisorHumanGate.getAllPendingRequests().length,
      totalRecoveriesAttempted: this._totalRecoveriesAttempted,
      totalRecoveriesSucceeded: this._totalRecoveriesSucceeded,
      totalRecoveriesFailed: this._totalRecoveriesFailed,
      totalEscalations: globalSupervisorEscalation.getAllEscalations().length,
      uptimeSeconds: Math.round((Date.now() - this._startTime) / 1000),
    };
  }

  public reset(): void {
    this._state = 'OBSERVING';
    this._safeStop = false;
    this._safeStopReason = undefined;
    this._activeAnomalies = [];
    this._activeDiagnoses.clear();
    this._activePlans.clear();
    globalSupervisorHumanGate.clear();
    globalSupervisorEscalation.clear();
  }
}

export const globalSupervisorRuntime = new SupervisorRuntime();
