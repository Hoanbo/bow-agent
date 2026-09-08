import { type InternetHealthLevel, type InternetHealthProbe } from './internetTypes.js';
import { type InternetAuditLedger } from './internetAudit.js';
export interface InternetHealthPolicy {
    readonly probeIntervalMs: number;
    readonly degradedThresholdMs: number;
    readonly unreachableAfterConsecutiveMisses: number;
}
export declare const DEFAULT_HEALTH_POLICY: Readonly<InternetHealthPolicy>;
export declare class InternetHealthMonitor {
    private _level;
    private _lastProbe?;
    private _consecutiveMisses;
    private _probeCount;
    private readonly _policy;
    private readonly _ledger;
    private _probeTimer?;
    constructor(policy?: Partial<InternetHealthPolicy>, ledger?: InternetAuditLedger);
    get level(): InternetHealthLevel;
    get lastProbe(): InternetHealthProbe | undefined;
    get probeCount(): number;
    get consecutiveMisses(): number;
    /**
     * Records a synthetic probe result (for testing or manual injection).
     * Production code feeds real RTT measurements from the TLS stack here.
     *
     * INVARIANT: Probe result does NOT change trust or admission state.
     */
    recordProbe(rttMs: number, reason?: string): InternetHealthProbe;
    /**
     * Starts a periodic synthetic probe timer (for integration tests or
     * active-probe enabled configurations).
     * Calls `probeCallback` on each interval; the callback must supply an RTT.
     */
    startPeriodicProbing(probeCallback: () => Promise<number>): void;
    /** Stops the periodic probing timer. */
    stopPeriodicProbing(): void;
    /** Returns a summary suitable for AgentLoop observation. */
    getSnapshot(): {
        level: InternetHealthLevel;
        probeCount: number;
        consecutiveMisses: number;
        lastProbe?: InternetHealthProbe;
    };
}
/**
 * Pure helper — classifies an RTT into a health level.
 */
export declare function classifyRtt(rttMs: number, degradedThresholdMs?: number): InternetHealthLevel;
