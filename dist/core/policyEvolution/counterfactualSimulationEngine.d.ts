import { type PolicyEvolutionProposal, type CounterfactualSimulationResult } from './policyEvolutionTypes.js';
import { IncidentHistoryArchiveStore } from '../crossIncident/incidentHistoryArchiveStore.js';
export interface RunSimulationOptions {
    readonly maxReplayIncidents?: number;
    readonly userId?: string;
}
export declare class CounterfactualSimulationEngine {
    private readonly archiveStore;
    constructor(archiveStore?: IncidentHistoryArchiveStore);
    /**
     * Replays proposed policy changes counterfactually against archived incident history.
     * Simulates what would have happened if the proposed policy were active.
     * Total authority: Level 0 Read-Only Analysis. Real execution is strictly prohibited.
     * Phát lại các thay đổi chính sách đề xuất theo phương pháp phản thực tế trên lịch sử sự cố đã lưu trữ.
     */
    simulateProposal(proposal: PolicyEvolutionProposal, options?: RunSimulationOptions): CounterfactualSimulationResult;
}
