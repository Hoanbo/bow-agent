// src/core/phase14Readiness/phase14ExecutionGate.ts
// BOWCON V4.0 — MS-1.4.12: END-TO-END AGENT REALITY VALIDATION & GOVERNED READINESS ASSESSMENT
// Component 970: Phase14ExecutionGate
// Synchronous USER_STOP Supremacy & Multi-Vector Security Boundary

import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { globalAuditLedger } from '../auditLedger.js';
import {
  Phase14ReadinessAbortedError,
  Phase14SecurityError,
  Phase14ValidationError,
} from './phase14ReadinessTypes.js';

export interface Phase14GateOptions {
  readonly isUserStopActive?: () => boolean;
  readonly getUserStopReason?: () => string | null;
}

export class Phase14ExecutionGate {
  private readonly _isUserStopActive: () => boolean;
  private readonly _getUserStopReason: () => string | null;

  constructor(options?: Phase14GateOptions) {
    this._isUserStopActive =
      options?.isUserStopActive ?? (() => globalMasterHumanAuthority.isUserStopActive);
    this._getUserStopReason =
      options?.getUserStopReason ?? (() => globalMasterHumanAuthority.userStopReason ?? null);
  }

  private assertUserStop(checkpointName: string, tenantId?: string): void {
    if (this._isUserStopActive()) {
      const reason = this._getUserStopReason() || 'Master human emergency stop activated';
      try {
        globalAuditLedger.record({
          timestamp: new Date().toISOString(),
          actor: { userId: 'master_human_authority', role: 'MASTER_HUMAN', channel: 'LOCAL_AUTHORITY' },
          domain: 'phase14_readiness',
          toolName: 'Phase14ExecutionGate',
          classification: 'USER_STOP_PREEMPTION',
          argumentsHash: `user_stop_${checkpointName}`,
          policyDecision: 'DENY',
          executionStatus: 'BLOCKED',
          resultHash: 'assessment_aborted',
        });
      } catch {
        // Fail closed; audit recording attempt completed
      }
      throw new Phase14ReadinessAbortedError(
        `USER_STOP at checkpoint [${checkpointName}] for tenant [${tenantId || 'GLOBAL'}]: ${reason}`
      );
    }
  }

  public validateIdentifier(value: string, fieldName: string): void {
    if (!value || typeof value !== 'string') {
      throw new Phase14ValidationError(`${fieldName} must be a non-empty string`);
    }
    if (value.length > 256) {
      throw new Phase14ValidationError(`${fieldName} exceeds maximum length of 256 characters`);
    }
    if (value.includes('\0')) {
      throw new Phase14SecurityError(`${fieldName} contains forbidden null byte`);
    }
    if (value.includes('..') || value.includes('/') || value.includes('\\')) {
      throw new Phase14SecurityError(`${fieldName} contains forbidden path traversal characters`);
    }
    if (value.toLowerCase().includes('shopofbow')) {
      throw new Phase14SecurityError(`${fieldName} references protected workspace shopofbow`);
    }
    if (value === '__proto__' || value === 'constructor' || value === 'prototype') {
      throw new Phase14SecurityError(`${fieldName} contains forbidden prototype pollution property name`);
    }
  }

  public validatePayload(payload: unknown, depth = 0): void {
    if (depth > 10) {
      throw new Phase14SecurityError('Payload exceeds maximum nesting depth of 10');
    }
    if (payload === null || typeof payload !== 'object') {
      return;
    }
    if (Array.isArray(payload)) {
      for (const item of payload) {
        this.validatePayload(item, depth + 1);
      }
      return;
    }
    for (const key of Object.keys(payload as Record<string, unknown>)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        throw new Phase14SecurityError(`Payload contains prototype pollution key: ${key}`);
      }
      this.validatePayload((payload as Record<string, unknown>)[key], depth + 1);
    }
  }

  /**
   * Checkpoint 1: Assessment Intake
   */
  public assertCheckpoint1_AssessmentIntake(tenantId: string): void {
    this.assertUserStop('CHECKPOINT_1_ASSESSMENT_INTAKE', tenantId);
    this.validateIdentifier(tenantId, 'tenantId');
  }

  /**
   * Checkpoint 2: Chaos Scenario Execution
   */
  public assertCheckpoint2_ChaosScenario(scenarioId: string, tenantId: string): void {
    this.assertUserStop('CHECKPOINT_2_CHAOS_SCENARIO', tenantId);
    this.validateIdentifier(scenarioId, 'scenarioId');
    this.validateIdentifier(tenantId, 'tenantId');
  }

  /**
   * Checkpoint 3: Exit Criteria Evaluation
   */
  public assertCheckpoint3_CriteriaEvaluation(criterionId: string, tenantId: string): void {
    this.assertUserStop('CHECKPOINT_3_CRITERIA_EVALUATION', tenantId);
    this.validateIdentifier(tenantId, 'tenantId');
  }

  /**
   * Checkpoint 4: Provenance Manifest Calculation
   */
  public assertCheckpoint4_ProvenanceCalculation(tenantId: string): void {
    this.assertUserStop('CHECKPOINT_4_PROVENANCE_CALCULATION', tenantId);
  }

  /**
   * Checkpoint 5: Readiness Report Sealing
   */
  public assertCheckpoint5_ReportSealing(reportId: string, tenantId: string): void {
    this.assertUserStop('CHECKPOINT_5_REPORT_SEALING', tenantId);
    this.validateIdentifier(reportId, 'reportId');
  }

  /**
   * Checkpoint 6: Result Export
   */
  public assertCheckpoint6_ResultExport(reportId: string, tenantId: string): void {
    this.assertUserStop('CHECKPOINT_6_RESULT_EXPORT', tenantId);
  }
}
