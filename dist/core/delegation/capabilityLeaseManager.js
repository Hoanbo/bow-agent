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
export class CapabilityLeaseError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(`[${code}] ${message}`);
        this.code = code;
        this.details = details;
        this.name = 'CapabilityLeaseError';
    }
}
export class CapabilityLeaseManager {
    leases = new Map();
    /**
     * Issues a time-bounded capability lease.
     */
    issueLease(input) {
        const now = Date.now();
        let expiresAt = now + input.ttlMs;
        // Enforce that lease expiration cannot exceed maximum boundary (e.g. parent delegation expiration)
        if (input.maxExpiresAt && expiresAt > input.maxExpiresAt) {
            expiresAt = input.maxExpiresAt;
        }
        if (expiresAt <= now) {
            throw new CapabilityLeaseError('INVALID_LEASE_DURATION', 'Capability lease cannot have expiration in the past or zero duration.');
        }
        const leaseId = `lease_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const lease = {
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
    revokeLease(leaseId, revokedBy, reason) {
        const lease = this.leases.get(leaseId);
        if (!lease) {
            throw new CapabilityLeaseError('LEASE_NOT_FOUND', `Capability lease "${leaseId}" not found.`);
        }
        const updated = {
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
    revokeLeasesForDelegation(delegationId, revokedBy, reason) {
        const revoked = [];
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
    validateLease(leaseId, context) {
        const lease = this.leases.get(leaseId);
        if (!lease) {
            throw new CapabilityLeaseError('LEASE_NOT_FOUND', `Capability lease "${leaseId}" not found.`);
        }
        // 1. Revocation check
        if (lease.isRevoked || lease.status === 'REVOKED') {
            throw new CapabilityLeaseError('LEASE_REVOKED', `Capability lease "${leaseId}" has been revoked.`);
        }
        // 2. Expiration check
        const now = context.now ?? Date.now();
        if (now >= lease.expiresAt || lease.status === 'EXPIRED') {
            // Transition state if not already marked
            if (lease.status !== 'EXPIRED') {
                this.leases.set(leaseId, { ...lease, status: 'EXPIRED' });
            }
            throw new CapabilityLeaseError('LEASE_EXPIRED', `Capability lease "${leaseId}" expired at ${lease.expiresAt} (current: ${now}).`);
        }
        // 3. Session isolation check
        if (lease.sessionId !== context.sessionId) {
            throw new CapabilityLeaseError('CROSS_SESSION_LEASE_REJECTED', `Lease session "${lease.sessionId}" does not match requested session "${context.sessionId}".`);
        }
        // 4. Capability match
        if (lease.capabilityId !== context.capabilityId) {
            throw new CapabilityLeaseError('CAPABILITY_MISMATCH', `Lease is for capability "${lease.capabilityId}", cannot be used for "${context.capabilityId}".`);
        }
        return lease;
    }
    getLease(leaseId) {
        return this.leases.get(leaseId);
    }
    getLeasesForDelegation(delegationId) {
        return Array.from(this.leases.values()).filter((l) => l.delegationId === delegationId);
    }
    clear() {
        this.leases.clear();
    }
}
export const globalCapabilityLeaseManager = new CapabilityLeaseManager();
