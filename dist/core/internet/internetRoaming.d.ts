import type { InternetRoamingReason, InternetNetworkInterface } from './internetTypes.js';
import { type InternetAuditLedger } from './internetAudit.js';
export interface InternetRoamingEvent {
    readonly reason: InternetRoamingReason;
    readonly previousInterface?: InternetNetworkInterface;
    readonly newInterface?: InternetNetworkInterface;
    readonly detectedAt: number;
    /** Sequence number, monotonically increasing per Edge session. */
    readonly sequence: number;
}
export interface InternetRoamingPolicy {
    /** Maximum number of consecutive roaming events before the edge is shut down. */
    readonly maxRoamingEvents: number;
    /** Minimum milliseconds between two roaming events (debounce). */
    readonly debounceMs: number;
}
export declare const DEFAULT_ROAMING_POLICY: Readonly<InternetRoamingPolicy>;
export declare class InternetRoamingTracker {
    private _sequence;
    private _lastRoamAt;
    private readonly _events;
    private readonly _policy;
    private readonly _ledger;
    constructor(policy?: Partial<InternetRoamingPolicy>, ledger?: InternetAuditLedger);
    /** Number of roaming events recorded. */
    get roamingCount(): number;
    /** All recorded roaming events (read-only). */
    get events(): readonly InternetRoamingEvent[];
    /**
     * Records a roaming event.
     * Throws InternetEdgeError if debounce window has not passed or if
     * the max roaming event limit has been reached.
     *
     * INVARIANT: Does not reset device identity.
     * INVARIANT: Does not trigger task re-execution.
     */
    recordRoaming(reason: InternetRoamingReason, opts?: {
        previousInterface?: InternetNetworkInterface;
        newInterface?: InternetNetworkInterface;
    }): InternetRoamingEvent;
    /**
     * Resets the roaming tracker for a new Edge session lifecycle.
     * Does NOT reset device identity.
     */
    reset(): void;
}
/**
 * Pure function — determines whether two network interfaces represent a roaming event.
 */
export declare function detectRoamingTransition(previous: InternetNetworkInterface | undefined, current: InternetNetworkInterface | undefined): InternetRoamingReason | undefined;
