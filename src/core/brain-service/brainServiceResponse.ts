// src/core/brain-service/brainServiceResponse.ts
// BOWCON V4.0 — MS-1.3.31: REAL BOWCON BRAIN SERVICE & CONTINUOUS RUNTIME
//
// Outbound Response Envelope Builder & Serializer.

import type {
  BrainServiceResponseEnvelope,
  BrainServiceHealthState,
  BrainQueueStatus,
  BrainFailureClassification,
} from './brainServiceTypes.js';
import type { BrainTaskResult } from '../brain/brainTypes.js';
import { BrainServiceError } from './brainServiceFailure.js';

export interface BuildSuccessResponseOptions {
  requestId: string;
  sessionId: string;
  result: BrainTaskResult;
  health: BrainServiceHealthState;
  queueStatus: BrainQueueStatus;
  durationMs: number;
  metadata?: Record<string, unknown>;
}

export interface BuildErrorResponseOptions {
  requestId: string;
  sessionId: string;
  error: unknown;
  health: BrainServiceHealthState;
  queueStatus: BrainQueueStatus;
  durationMs: number;
  metadata?: Record<string, unknown>;
}

export function buildSuccessResponse(options: BuildSuccessResponseOptions): BrainServiceResponseEnvelope {
  return {
    requestId: options.requestId,
    sessionId: options.sessionId,
    success: true,
    result: options.result,
    health: options.health,
    queueStatus: options.queueStatus,
    durationMs: options.durationMs,
    timestamp: Date.now(),
    metadata: options.metadata,
  };
}

export function buildErrorResponse(options: BuildErrorResponseOptions): BrainServiceResponseEnvelope {
  let code = 'BRAIN_SERVICE_EXECUTION_FAILED';
  let message = 'An unknown execution error occurred';
  let classification: BrainFailureClassification = 'RECOVERABLE';
  let recoverable = true;

  const err = options.error;
  if (err instanceof BrainServiceError) {
    code = err.code;
    message = err.message;
    classification = err.classification;
    recoverable = err.recoverable;
  } else if (err instanceof Error) {
    message = err.message;
  }

  return {
    requestId: options.requestId,
    sessionId: options.sessionId,
    success: false,
    error: {
      code,
      message,
      classification,
      recoverable,
      timestamp: Date.now(),
    },
    health: options.health,
    queueStatus: options.queueStatus,
    durationMs: options.durationMs,
    timestamp: Date.now(),
    metadata: options.metadata,
  };
}

export function serializeResponseJson(response: BrainServiceResponseEnvelope): string {
  return JSON.stringify(response);
}
