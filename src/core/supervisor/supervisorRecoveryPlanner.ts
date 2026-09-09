// src/core/supervisor/supervisorRecoveryPlanner.ts
// BOWCON V4.0 — MS-1.3.35: REAL BOWCON SUPERVISORY AUTONOMOUS RECOVERY & HUMAN GOVERNANCE RUNTIME
//
// Mutation-Free Recovery Planner.
//
// INVARIANTS:
// PLAN != EXECUTION
// Planning must produce strictly ZERO physical mutation on the host.

import crypto from 'node:crypto';
import type { Diagnosis, RecoveryPlan, RecoveryStep } from './supervisorTypes.js';

export class SupervisorRecoveryPlanner {
  public planRecovery(diagnosis: Diagnosis): RecoveryPlan {
    const planId = `rplan_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const steps: RecoveryStep[] = [];

    let riskLevel = 'LOW';
    let timeoutMs = 10_000;
    const maxAttempts = 3; // Strict bounded retry invariant

    if (diagnosis.isInconclusive || diagnosis.recoverability === 'CRITICAL_BLOCKED') {
      return {
        planId,
        diagnosisId: diagnosis.diagnosisId,
        anomalyId: diagnosis.anomalyId,
        recoveryClass: diagnosis.recoverability,
        steps: [],
        requiresHumanApproval: true,
        riskLevel: 'CRITICAL',
        timeoutMs: 5000,
        maxAttempts: 1,
        createdTimestamp: Date.now(),
      };
    }

    switch (diagnosis.recoverability) {
      case 'AUTO_SAFE':
        riskLevel = 'OBSERVE';
        if (diagnosis.recommendedRecovery === 'REPROBE_CAPABILITY') {
          steps.push({
            stepIndex: 0,
            description: 'Probe capability health and reset state to AVAILABLE if operational',
            capabilityId: diagnosis.affectedCapability,
            parameters: { probe: true },
            isReversible: false,
          });
        } else if (diagnosis.recommendedRecovery === 'RECONNECT_COGNITIVE_PROVIDER') {
          steps.push({
            stepIndex: 0,
            description: 'Reset cognitive provider circuit breaker and probe connection',
            capabilityId: 'cap_obs_system',
            parameters: { reconnect: true },
            isReversible: false,
          });
        } else {
          steps.push({
            stepIndex: 0,
            description: 'Refresh host and capability observation snapshot',
            parameters: { refresh: true },
            isReversible: false,
          });
        }
        break;

      case 'AUTO_REVERSIBLE':
        riskLevel = 'REVERSIBLE';
        steps.push({
          stepIndex: 0,
          description: 'Restart governed child process under supervisor monitoring',
          capabilityId: 'cap_proc_start',
          parameters: { restart: true },
          isReversible: true,
          rollbackStep: {
            capabilityId: 'cap_proc_stop',
            parameters: { force: true },
          },
        });
        break;

      case 'HUMAN_REQUIRED':
        riskLevel = 'ELEVATED';
        steps.push({
          stepIndex: 0,
          description: 'Execute governed operator-approved repair action',
          parameters: { requireApproval: true },
          isReversible: false,
        });
        break;

      default:
        break;
    }

    return {
      planId,
      diagnosisId: diagnosis.diagnosisId,
      anomalyId: diagnosis.anomalyId,
      recoveryClass: diagnosis.recoverability,
      steps,
      requiresHumanApproval: diagnosis.requiresHumanApproval,
      riskLevel,
      timeoutMs,
      maxAttempts,
      createdTimestamp: Date.now(),
    };
  }
}

export const globalSupervisorRecoveryPlanner = new SupervisorRecoveryPlanner();
