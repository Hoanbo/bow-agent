import type { CapabilityLease } from './delegationTypes.js';
export declare class CapabilityLeaseError extends Error {
    readonly code: string;
    readonly details?: Record<string, unknown> | undefined;
    constructor(code: string, message: string, details?: Record<string, unknown> | undefined);
}
export interface IssueLeaseInput {
    delegationId: string;
    capabilityId: string;
    grantedBy: string;
    grantedTo: string;
    deviceId: string;
    sessionId: string;
    ttlMs: number;
    maxExpiresAt?: number;
}
export declare class CapabilityLeaseManager {
    private leases;
    /**
     * Issues a time-bounded capability lease.
     */
    issueLease(input: IssueLeaseInput): CapabilityLease;
    /**
     * Revokes an active capability lease immediately.
     * INVARIANT: REVOCATION > AGENT_INTENT.
     */
    revokeLease(leaseId: string, revokedBy: string, reason?: string): CapabilityLease;
    /**
     * Revokes all capability leases associated with a specific delegation.
     */
    revokeLeasesForDelegation(delegationId: string, revokedBy: string, reason?: string): CapabilityLease[];
    /**
     * Validates that a capability lease is currently active, unrevoked, unexpired,
     * matching the session, and matching the capability.
     */
    validateLease(leaseId: string, context: {
        sessionId: string;
        capabilityId: string;
        now?: number;
    }): CapabilityLease;
    getLease(leaseId: string): CapabilityLease | undefined;
    getLeasesForDelegation(delegationId: string): CapabilityLease[];
    clear(): void;
}
export declare const globalCapabilityLeaseManager: CapabilityLeaseManager;
