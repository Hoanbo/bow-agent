// src/core/brain-service/brainServiceFailure.ts
// BOWCON V4.0 — MS-1.3.31: REAL BOWCON BRAIN SERVICE & CONTINUOUS RUNTIME
//
// Strongly-typed Error Hierarchy and Failure Classification Engine.

import type { BrainFailureClassification } from './brainServiceTypes.js';

export type BrainServiceErrorCode =
  | 'BRAIN_SERVICE_NOT_READY'
  | 'BRAIN_SERVICE_BUSY'
  | 'BRAIN_SERVICE_BACKPRESSURE'
  | 'BRAIN_SERVICE_SHUTTING_DOWN'
  | 'BRAIN_SERVICE_INVALID_REQUEST'
  | 'BRAIN_SERVICE_DUPLICATE_REQUEST'
  | 'BRAIN_SERVICE_EXECUTION_FAILED'
  | 'BRAIN_SERVICE_PERSISTENCE_FAILED'
  | 'BRAIN_SERVICE_RECOVERY_FAILED'
  | 'BRAIN_SERVICE_INTERNAL_ERROR'
  | 'BRAIN_SERVICE_FATAL_ERROR';

export class BrainServiceError extends Error {
  public readonly code: BrainServiceErrorCode;
  public readonly classification: BrainFailureClassification;
  public readonly recoverable: boolean;
  public readonly timestamp: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: BrainServiceErrorCode,
    message: string,
    classification: BrainFailureClassification = 'RECOVERABLE',
    details?: Record<string, unknown>
  ) {
    super(`[${code}] ${message}`);
    this.name = 'BrainServiceError';
    this.code = code;
    this.classification = classification;
    this.recoverable = classification === 'RECOVERABLE';
    this.timestamp = Date.now();
    this.details = details;
  }
}

export function classifyServiceError(err: unknown): BrainFailureClassification {
  if (err instanceof BrainServiceError) {
    return err.classification;
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (
      msg.includes('fatal') ||
      msg.includes('unrecoverable') ||
      msg.includes('corruption') ||
      msg.includes('out of memory')
    ) {
      return 'FATAL';
    }
    if (msg.includes('timeout') || msg.includes('busy') || msg.includes('degraded')) {
      return 'DEGRADED';
    }
  }
  return 'RECOVERABLE';
}

export function isFatalServiceError(err: unknown): boolean {
  return classifyServiceError(err) === 'FATAL';
}
