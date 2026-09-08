import type { BrainRuntime } from '../brain/brainRuntime.js';
import type { BrainServiceHealthMonitor } from './brainServiceHealth.js';
import type { BrainServiceAuditLedger } from './brainServiceAudit.js';
import { type BrainFailureClassification, type BrainServiceRequestEnvelope } from './brainServiceTypes.js';
export interface BrainServiceRecoveryResult {
    recovered: boolean;
    classification: BrainFailureClassification;
    message: string;
}
export declare class BrainServiceRecovery {
    private readonly _brainRuntime;
    private readonly _healthMonitor;
    private readonly _auditLedger;
    constructor(brainRuntime: BrainRuntime, healthMonitor: BrainServiceHealthMonitor, auditLedger: BrainServiceAuditLedger);
    /**
     * Attempt recovery from an execution error.
     * If error is RECOVERABLE or DEGRADED, resets Brain runtime state to IDLE
     * so it can accept subsequent tasks without restarting the service process.
     */
    handleFailure(error: unknown, request?: BrainServiceRequestEnvelope): Promise<BrainServiceRecoveryResult>;
}
