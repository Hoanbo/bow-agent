import type { PolicyDelta } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import { EmergencyStopProvider, SyntheticStressConfig, SyntheticStressResult } from './GovernedPolicySimulationTypes.js';
export declare class SyntheticPolicyStressHarness {
    private readonly emergencyStopProvider?;
    constructor(emergencyStopProvider?: EmergencyStopProvider);
    private assertEmergencyStopInactive;
    /**
     * Executes bounded deterministic in-memory stress probes.
     * NON-ACTUATING: Generates synthetic envelopes without invoking external processes or tools.
     */
    executeStressHarness(candidateDeltas: readonly PolicyDelta[], config?: Partial<SyntheticStressConfig>): SyntheticStressResult;
}
