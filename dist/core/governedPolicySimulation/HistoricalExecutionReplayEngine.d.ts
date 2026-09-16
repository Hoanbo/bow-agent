import type { PolicyDomain, PolicyDelta } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import { EmergencyStopProvider, HistoricalObservationItem, ReplayExecutionResult } from './GovernedPolicySimulationTypes.js';
export interface ReplayEngineConfig {
    readonly maxReplayBatchSize?: number;
}
export declare class HistoricalExecutionReplayEngine {
    private readonly emergencyStopProvider?;
    private readonly maxReplayBatchSize;
    constructor(emergencyStopProvider?: EmergencyStopProvider, config?: ReplayEngineConfig);
    private assertEmergencyStopInactive;
    private sanitizeTenantId;
    /**
     * Replays historical observation corpus against candidate policy changes in memory.
     * REPLAY != RE-EXECUTION: Zero tools are called, zero external processes or side-effects.
     */
    replayCorpus(tenantId: string, policyDomain: PolicyDomain, candidateDeltas: readonly PolicyDelta[], historicalCorpus: readonly HistoricalObservationItem[]): ReplayExecutionResult;
}
