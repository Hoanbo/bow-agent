import { EmergencyStopProvider, ReplayExecutionResult, CounterfactualAssuranceProjection } from './GovernedPolicySimulationTypes.js';
export declare class CounterfactualAssuranceProjector {
    private readonly emergencyStopProvider?;
    private readonly falseRejectionThreshold;
    constructor(emergencyStopProvider?: EmergencyStopProvider, falseRejectionThreshold?: number);
    private assertEmergencyStopInactive;
    /**
     * Projects prospective assurance score A_proj and regression risk.
     * SIMULATION_SCORE != AUTHORIZATION: High projected assurance gives zero approval power.
     */
    projectAssuranceImpact(replayResult: ReplayExecutionResult, baselineAssurance: number): CounterfactualAssuranceProjection;
}
