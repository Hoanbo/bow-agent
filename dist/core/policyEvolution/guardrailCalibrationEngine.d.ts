import { type PolicyEvolutionProposal, type CounterfactualSimulationResult, type GuardrailCalibrationResult } from './policyEvolutionTypes.js';
export declare class GuardrailCalibrationEngine {
    private static readonly HARD_FORBIDDEN_ACTIONS;
    /**
     * Calibrates and validates guardrails for a proposed policy change against counterfactual evidence.
     * Rejects proposals that degrade safety even if they improve operational MTTR.
     * Hiệu chuẩn và xác thực các biên giới bảo vệ cho đề xuất chính sách so với bằng chứng phản thực tế.
     */
    calibrateGuardrails(proposal: PolicyEvolutionProposal, simulationResult: CounterfactualSimulationResult): GuardrailCalibrationResult;
}
