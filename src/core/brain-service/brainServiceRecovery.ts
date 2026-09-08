// src/core/brain-service/brainServiceRecovery.ts
// BOWCON V4.0 — MS-1.3.31: REAL BOWCON BRAIN SERVICE & CONTINUOUS RUNTIME
//
// Crash / Recovery Boundary & Recovery Orchestrator.
//
// CARDINAL INVARIANTS:
// FAILURE != BRAIN_DEATH
// RECOVERABLE_FAILURE != SERVICE_TERMINATION

import type { BrainRuntime } from '../brain/brainRuntime.js';
import type { BrainServiceHealthMonitor } from './brainServiceHealth.js';
import type { BrainServiceAuditLedger } from './brainServiceAudit.js';
import {
  type BrainFailureClassification,
  type BrainServiceRequestEnvelope,
} from './brainServiceTypes.js';
import {
  BrainServiceError,
  classifyServiceError,
} from './brainServiceFailure.js';

export interface BrainServiceRecoveryResult {
  recovered: boolean;
  classification: BrainFailureClassification;
  message: string;
}

export class BrainServiceRecovery {
  private readonly _brainRuntime: BrainRuntime;
  private readonly _healthMonitor: BrainServiceHealthMonitor;
  private readonly _auditLedger: BrainServiceAuditLedger;

  constructor(
    brainRuntime: BrainRuntime,
    healthMonitor: BrainServiceHealthMonitor,
    auditLedger: BrainServiceAuditLedger
  ) {
    this._brainRuntime = brainRuntime;
    this._healthMonitor = healthMonitor;
    this._auditLedger = auditLedger;
  }

  /**
   * Attempt recovery from an execution error.
   * If error is RECOVERABLE or DEGRADED, resets Brain runtime state to IDLE
   * so it can accept subsequent tasks without restarting the service process.
   */
  public async handleFailure(
    error: unknown,
    request?: BrainServiceRequestEnvelope
  ): Promise<BrainServiceRecoveryResult> {
    const classification = classifyServiceError(error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    this._auditLedger.record(
      'FAILURE_CLASSIFIED',
      {
        classification,
        error: errorMessage,
      },
      request?.requestId
    );

    if (classification === 'FATAL') {
      this._healthMonitor.setRuntimeHealth(false);
      return {
        recovered: false,
        classification: 'FATAL',
        message: `Fatal error encountered: ${errorMessage}. Cannot recover automatically.`,
      };
    }

    // Recoverable or Degraded: Reset brain runtime so it is ready for the next request
    this._auditLedger.record('RECOVERY_INITIATED', { classification }, request?.requestId);

    try {
      // Reset brain runtime from FAILED/COMPLETED back to IDLE
      this._brainRuntime.reset();
      this._healthMonitor.recordRecovery();

      this._auditLedger.record(
        'RECOVERY_COMPLETED',
        { recovered: true, classification },
        request?.requestId
      );

      return {
        recovered: true,
        classification,
        message: `Brain service successfully recovered from ${classification.toLowerCase()} error.`,
      };
    } catch (recErr: any) {
      this._healthMonitor.setRuntimeHealth(false);
      throw new BrainServiceError(
        'BRAIN_SERVICE_RECOVERY_FAILED',
        `Recovery sequence failed: ${recErr.message}`,
        'FATAL'
      );
    }
  }
}
