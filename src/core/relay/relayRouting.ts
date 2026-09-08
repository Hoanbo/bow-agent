// src/core/relay/relayRouting.ts
// BOWCON V4.0 — SECURE ALWAYS-ON BRAIN RELAY & REMOTE SESSION RUNTIME (MS-1.3.27)
//
// Message routing across categories without cognitive reinterpretation.
//
// INVARIANTS:
// - Relay MUST route messages only.
// - Relay MUST NOT reinterpret cognitive payloads.
// - Relay MUST NOT modify task meaning.
// - Relay MUST NOT downgrade risk level.
// - Relay MUST preserve message identity, sequence, scope, and risk level.

import type { RelayMessage, RelayRiskLevel } from './relayTypes.js';

export class RelayRoutingError extends Error {
  constructor(message: string) {
    super(`RELAY_ROUTING_ERROR: ${message}`);
    this.name = 'RelayRoutingError';
  }
}

const RISK_HIERARCHY: Record<RelayRiskLevel, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

export class RelayMessageRouter {
  private totalRouted: number = 0;

  /**
   * Routes an envelope without mutating payload meaning or downgrading risk.
   */
  public route(message: RelayMessage): RelayMessage {
    this.validateMessageStructure(message);
    this.totalRouted++;
    // Returns frozen immutable copy preserving all invariants
    return Object.freeze({ ...message });
  }

  public getTotalRouted(): number {
    return this.totalRouted;
  }

  private validateMessageStructure(msg: RelayMessage): void {
    if (!msg) throw new RelayRoutingError('Message cannot be null.');
    if (!msg.messageId || typeof msg.messageId !== 'string') {
      throw new RelayRoutingError('Missing messageId.');
    }
    if (!msg.sessionId || typeof msg.sessionId !== 'string') {
      throw new RelayRoutingError('Missing sessionId.');
    }
    if (!msg.deviceId || typeof msg.deviceId !== 'string') {
      throw new RelayRoutingError('Missing deviceId.');
    }
    if (!msg.surfaceId || typeof msg.surfaceId !== 'string') {
      throw new RelayRoutingError('Missing surfaceId.');
    }
    if (typeof msg.sequence !== 'number' || msg.sequence < 0) {
      throw new RelayRoutingError('Invalid message sequence.');
    }
    if (!msg.riskLevel || !(msg.riskLevel in RISK_HIERARCHY)) {
      throw new RelayRoutingError(`Invalid riskLevel: ${msg.riskLevel}`);
    }
  }

  /**
   * Asserts that routing did not alter critical message invariants.
   */
  public static assertRoutingPreservation(original: RelayMessage, forwarded: RelayMessage): void {
    if (original.messageId !== forwarded.messageId) {
      throw new RelayRoutingError('ROUTING_VIOLATION: messageId was mutated during routing.');
    }
    if (original.sequence !== forwarded.sequence) {
      throw new RelayRoutingError('ROUTING_VIOLATION: sequence was mutated during routing.');
    }
    if (original.sessionId !== forwarded.sessionId) {
      throw new RelayRoutingError('ROUTING_VIOLATION: sessionId was mutated during routing.');
    }
    if (original.deviceId !== forwarded.deviceId) {
      throw new RelayRoutingError('ROUTING_VIOLATION: deviceId was mutated during routing.');
    }
    if (original.surfaceId !== forwarded.surfaceId) {
      throw new RelayRoutingError('ROUTING_VIOLATION: surfaceId was mutated during routing.');
    }
    if (RISK_HIERARCHY[forwarded.riskLevel] < RISK_HIERARCHY[original.riskLevel]) {
      throw new RelayRoutingError(
        `SECURITY_VIOLATION: Risk level was downgraded from ${original.riskLevel} to ${forwarded.riskLevel}`
      );
    }
  }
}
