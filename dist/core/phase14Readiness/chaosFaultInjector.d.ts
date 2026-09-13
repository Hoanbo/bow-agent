import { Phase14ChaosFaultType, Phase14ChaosScenarioResult } from './phase14ReadinessTypes.js';
import { Phase14ExecutionGate } from './phase14ExecutionGate.js';
export interface ChaosScenarioConfig {
    readonly scenarioId: string;
    readonly faultType: Phase14ChaosFaultType;
    readonly targetSubsystem: string;
    readonly tenantId: string;
}
export declare class ChaosFaultInjector {
    private readonly _gate;
    constructor(gate: Phase14ExecutionGate);
    /**
     * Run a simulated chaos fault scenario and observe containment resilience
     */
    executeChaosScenario(config: ChaosScenarioConfig): Promise<Phase14ChaosScenarioResult>;
}
