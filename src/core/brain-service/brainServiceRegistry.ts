// src/core/brain-service/brainServiceRegistry.ts
// BOWCON V4.0 — MS-1.3.31: REAL BOWCON BRAIN SERVICE & CONTINUOUS RUNTIME
//
// Single Brain Authority Registry & Session Mapping.
//
// CARDINAL INVARIANTS:
// ONE_BRAIN == ONE_AUTHORITATIVE_BRAIN
// BRAIN_SERVICE != BRAIN
// SERVICE_PROCESS != COGNITIVE_AUTHORITY

import type { BrainId } from '../brain/brainTypes.js';
import type { BrainServiceId } from './brainServiceTypes.js';
import { BrainServiceError } from './brainServiceFailure.js';

export class BrainServiceRegistry {
  private static _instance: BrainServiceRegistry | undefined;
  private _registeredBrainId: BrainId | null = null;
  private _registeredServiceId: BrainServiceId | null = null;
  private readonly _activeSessions = new Map<string, { sessionId: string; deviceId: string; lastSeenAt: number }>();

  public static getInstance(): BrainServiceRegistry {
    if (!BrainServiceRegistry._instance) {
      BrainServiceRegistry._instance = new BrainServiceRegistry();
    }
    return BrainServiceRegistry._instance;
  }

  public registerAuthority(serviceId: BrainServiceId, brainId: BrainId): void {
    if (this._registeredBrainId && this._registeredBrainId !== brainId) {
      throw new BrainServiceError(
        'BRAIN_SERVICE_INTERNAL_ERROR',
        `Violation of ONE_BRAIN invariant: Attempted to register Brain "${brainId}" when Brain "${this._registeredBrainId}" is already authoritative.`,
        'FATAL'
      );
    }
    this._registeredBrainId = brainId;
    this._registeredServiceId = serviceId;
  }

  public unregisterAuthority(serviceId: BrainServiceId): void {
    if (this._registeredServiceId === serviceId) {
      this._registeredBrainId = null;
      this._registeredServiceId = null;
      this._activeSessions.clear();
    }
  }

  public registerSession(sessionId: string, deviceId: string): void {
    this._activeSessions.set(sessionId, {
      sessionId,
      deviceId,
      lastSeenAt: Date.now(),
    });
  }

  public getSession(sessionId: string) {
    return this._activeSessions.get(sessionId);
  }

  public get registeredBrainId(): BrainId | null {
    return this._registeredBrainId;
  }

  public get registeredServiceId(): BrainServiceId | null {
    return this._registeredServiceId;
  }

  public resetForTest(): void {
    this._registeredBrainId = null;
    this._registeredServiceId = null;
    this._activeSessions.clear();
  }
}
