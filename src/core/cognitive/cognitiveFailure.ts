// src/core/cognitive/cognitiveFailure.ts
// BOWCON V4.0 — MS-1.3.32: COGNITIVE PROVIDER FAILURE TAXONOMY
//
// Invariant:
// FAILURE != BRAIN_DEATH
// A provider failure is a cognitive observation, not a termination signal.

import type { CognitiveProviderType } from './cognitiveTypes.js';

export type CognitiveFailureCode =
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_INVALID_RESPONSE'
  | 'PROVIDER_MALFORMED_OUTPUT'
  | 'PROVIDER_AUTH_FAILURE'
  | 'PROVIDER_RATE_LIMITED'
  | 'PROVIDER_PROTOCOL_ERROR'
  | 'PROVIDER_INTERNAL_ERROR';

export class CognitiveError extends Error {
  public readonly code: CognitiveFailureCode;
  public readonly providerType?: CognitiveProviderType;
  public readonly isRecoverable: boolean;
  public readonly timestamp: string;

  constructor(
    code: CognitiveFailureCode,
    message: string,
    options?: {
      providerType?: CognitiveProviderType;
      isRecoverable?: boolean;
      cause?: unknown;
    }
  ) {
    super(`[${code}] ${message}`);
    this.name = 'CognitiveError';
    this.code = code;
    this.providerType = options?.providerType;
    this.isRecoverable = options?.isRecoverable ?? true;
    this.timestamp = new Date().toISOString();
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}

export function isRecoverableCognitiveError(error: unknown): boolean {
  if (error instanceof CognitiveError) {
    return error.isRecoverable;
  }
  return true; // Default to recoverable so Brain survives unexpected exceptions
}

export function classifyCognitiveError(error: unknown): CognitiveFailureCode {
  if (error instanceof CognitiveError) {
    return error.code;
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    const name = error.name.toLowerCase();
    if (name.includes('abort') || msg.includes('timeout') || msg.includes('timed out')) {
      return 'PROVIDER_TIMEOUT';
    }
    if (msg.includes('econnrefused') || msg.includes('unreachable') || msg.includes('fetch failed') || msg.includes('offline')) {
      return 'PROVIDER_UNAVAILABLE';
    }
    if (msg.includes('rate limit') || msg.includes('429')) {
      return 'PROVIDER_RATE_LIMITED';
    }
    if (msg.includes('401') || msg.includes('403') || msg.includes('unauthorized') || msg.includes('forbidden')) {
      return 'PROVIDER_AUTH_FAILURE';
    }
    if (msg.includes('json') || msg.includes('parse') || msg.includes('syntaxerror')) {
      return 'PROVIDER_MALFORMED_OUTPUT';
    }
    if (msg.includes('protocol') || msg.includes('econnreset')) {
      return 'PROVIDER_PROTOCOL_ERROR';
    }
  }
  return 'PROVIDER_INTERNAL_ERROR';
}
