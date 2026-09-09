// src/core/supervisor/supervisor.ts
// BOWCON V4.0 — MS-1.3.35: REAL BOWCON SUPERVISORY AUTONOMOUS RECOVERY & HUMAN GOVERNANCE RUNTIME
//
// Ergonomic High-Level Supervisory Facade for BrainRuntime and CognitivePipeline.

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
import { globalSupervisorRuntime } from './supervisorRuntime.js';
import { globalSupervisorHumanGate } from './supervisorHumanGate.js';

export class SupervisorFacade {
  public observe(): ObservationSnapshot {
    return globalSupervisorRuntime.observe();
  }

  public getActiveAnomalies(): readonly Anomaly[] {
    return globalSupervisorRuntime.getActiveAnomalies();
  }

  public diagnose(anomaly: Anomaly): Diagnosis {
    return globalSupervisorRuntime.diagnose(anomaly);
  }

  public planRecovery(diagnosis: Diagnosis): RecoveryPlan {
    return globalSupervisorRuntime.planRecovery(diagnosis);
  }

  public requestHumanApproval(
    diagnosis: Diagnosis,
    plan: RecoveryPlan,
    options?: { target?: string; affectedResources?: string[] }
  ): HumanGateRequest {
    return globalSupervisorRuntime.requestHumanApproval(diagnosis, plan, options);
  }

  public approveRecovery(
    requestId: string,
    operatorId: string,
    context?: { deviceId?: string }
  ): HumanGateRequest {
    return globalSupervisorRuntime.approveRecovery(requestId, operatorId, context);
  }

  public denyRecovery(requestId: string, reason: string): HumanGateRequest {
    return globalSupervisorRuntime.denyRecovery(requestId, reason);
  }

  public async executeRecovery(
    plan: RecoveryPlan,
    diagnosis: Diagnosis,
    options?: { isDryRun?: boolean; authorizationToken?: any }
  ): Promise<{ success: boolean; verified: boolean; error?: string; escalation?: EscalationRecord }> {
    return globalSupervisorRuntime.executeRecovery(plan, diagnosis, options);
  }

  public safeStop(reason: string): void {
    globalSupervisorRuntime.activateSafeStop(reason);
  }

  public resetSafeStop(operatorToken: string): void {
    globalSupervisorRuntime.resetSafeStop(operatorToken);
  }

  public isSafeStopActive(): boolean {
    return globalSupervisorRuntime.isSafeStopActive();
  }

  public getHealth(): SupervisorHealth {
    return globalSupervisorRuntime.getHealth();
  }

  public getCurrentState(): SupervisorRuntimeState {
    return globalSupervisorRuntime.getCurrentState();
  }

  public getPendingHumanGates(): HumanGateRequest[] {
    return globalSupervisorHumanGate.getAllPendingRequests();
  }
}

export const supervisor = new SupervisorFacade();
