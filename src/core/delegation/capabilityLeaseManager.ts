// src/core/delegation/capabilityLeaseManager.ts
// BOWCON V4.0 — MS-1.3.45: CAPABILITY LEASE MANAGER
//
// INVARIANTS:
// - CAPABILITY != AUTHORIZATION
// - REVOCATION > AGENT_INTENT
// - EXPIRED != ACTIVE
// - SESSION_MATCHING == STRICT
// - A capability lease designates scoped, time-bounded permission,
//   NOT automatic or unbounded execution authority.

import crypto from 'node:crypto';
import type { CapabilityLease, CapabilityLeaseState } from './delegationTypes.js';

export class CapabilityLeaseError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(`[${code}] ${message}`);
    this.name = 'CapabilityLeaseError';
  }
}

export interface IssueLeaseInput {
  delegationId: string;
  capabilityId: string;
  grantedBy: string;
  grantedTo: string; // agentId
  deviceId: string;
  sessionId: string;
  ttlMs: number;
  maxExpiresAt?: number;
}

export class CapabilityLeaseManager {
  private leases = new Map<string, CapabilityLease>();

  /**
   * Issues a time-bounded capability lease.
   */
  public issueLease(input: IssueLeaseInput): CapabilityLease {
    const now = Date.now();
    let expiresAt = now + input.ttlMs;

    // Enforce that lease expiration cannot exceed maximum boundary (e.g. parent delegation expiration)
    if (input.maxExpiresAt && expiresAt > input.maxExpiresAt) {
      expiresAt = input.maxExpiresAt;
    }

    if (expiresAt <= now) {
      throw new CapabilityLeaseError(
        'INVALID_LEASE_DURATION',
        'Capability lease cannot have expiration in the past or zero duration.'
      );
    }

    const leaseId = `lease_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const lease: CapabilityLease = {
      leaseId,
      delegationId: input.delegationId,
      capabilityId: input.capabilityId,
      grantedBy: input.grantedBy,
      grantedTo: input.grantedTo,
      deviceId: input.deviceId,
      sessionId: input.sessionId,
      issuedAt: now,
      expiresAt,
      isRevoked: false,
      status: 'ACTIVE',
    };

    this.leases.set(leaseId, lease);
    return lease;
  }

  /**
   * Revokes an active capability lease immediately.
   * INVARIANT: REVOCATION > AGENT_INTENT.
   */
  public revokeLease(leaseId: string, revokedBy: string, reason?: string): CapabilityLease {
    const lease = this.leases.get(leaseId);
    if (!lease) {
      throw new CapabilityLeaseError(
        'LEASE_NOT_FOUND',
        `Capability lease "${leaseId}" not found.`
      );
    }

    const updated: CapabilityLease = {
      ...lease,
      isRevoked: true,
      revokedAt: Date.now(),
      revokedBy,
      revocationReason: reason || 'Revoked by authority',
      status: 'REVOKED',
    };

    this.leases.set(leaseId, updated);
    return updated;
  }

  /**
   * Revokes all capability leases associated with a specific delegation.
   */
  public revokeLeasesForDelegation(
    delegationId: string,
    revokedBy: string,
    reason?: string
  ): CapabilityLease[] {
    const revoked: CapabilityLease[] = [];
    for (const [id, lease] of this.leases.entries()) {
      if (lease.delegationId === delegationId && !lease.isRevoked) {
        revoked.push(this.revokeLease(id, revokedBy, reason));
      }
    }
    return revoked;
  }

  /**
   * Validates that a capability lease is currently active, unrevoked, unexpired,
   * matching the session, and matching the capability.
   */
  public validateLease(
    leaseId: string,
    context: {
      sessionId: string;
      capabilityId: string;
      now?: number;
    }
  ): CapabilityLease {
    const lease = this.leases.get(leaseId);
    if (!lease) {
      throw new CapabilityLeaseError(
        'LEASE_NOT_FOUND',
        `Capability lease "${leaseId}" not found.`
      );
    }

    // 1. Revocation check
    if (lease.isRevoked || lease.status === 'REVOKED') {
      throw new CapabilityLeaseError(
        'LEASE_REVOKED',
        `Capability lease "${leaseId}" has been revoked.`
      );
    }

    // 2. Expiration check
    const now = context.now ?? Date.now();
    if (now >= lease.expiresAt || lease.status === 'EXPIRED') {
      // Transition state if not already marked
      if (lease.status !== 'EXPIRED') {
        this.leases.set(leaseId, { ...lease, status: 'EXPIRED' });
      }
      throw new CapabilityLeaseError(
        'LEASE_EXPIRED',
        `Capability lease "${leaseId}" expired at ${lease.expiresAt} (current: ${now}).`
      );
    }

    // 3. Session isolation check
    if (lease.sessionId !== context.sessionId) {
      throw new CapabilityLeaseError(
        'CROSS_SESSION_LEASE_REJECTED',
        `Lease session "${lease.sessionId}" does not match requested session "${context.sessionId}".`
      );
    }

    // 4. Capability match
    if (lease.capabilityId !== context.capabilityId) {
      throw new CapabilityLeaseError(
        'CAPABILITY_MISMATCH',
        `Lease is for capability "${lease.capabilityId}", cannot be used for "${context.capabilityId}".`
      );
    }

    return lease;
  }

  public getLease(leaseId: string): CapabilityLease | undefined {
    return this.leases.get(leaseId);
  }

  public getLeasesForDelegation(delegationId: string): CapabilityLease[] {
    return Array.from(this.leases.values()).filter((l) => l.delegationId === delegationId);
  }

  public clear(): void {
    this.leases.clear();
  }
}

export const globalCapabilityLeaseManager = new CapabilityLeaseManager();
