import { type PolicyEvolutionProposal, type CounterfactualSimulationResult, type GuardrailCalibrationResult, type PolicyReviewRecord, type PolicyEvolutionProvenanceRecord } from './policyEvolutionTypes.js';
export interface GenerateEvolutionProvenanceInput {
    readonly proposal: PolicyEvolutionProposal;
    readonly simulationResult: CounterfactualSimulationResult;
    readonly guardrailResult: GuardrailCalibrationResult;
    readonly reviewRecord?: PolicyReviewRecord;
    readonly deployedVersionChecksum?: string;
    readonly timestamp?: number;
}
export declare class PolicyEvolutionProvenanceEngine {
    /**
     * Computes the deterministic SHA-256 digest over the entire evolution chain.
     * Tính toán tóm lược SHA-256 xác định qua toàn bộ chuỗi tiến hóa.
     */
    computeProvenanceHash(proposalId: string, baseVersionHash: string, diffHash: string, simulationHash: string, guardrailHash: string, reviewHash: string, timestamp: number): string;
    /**
     * Generates a tamper-evident cryptographic provenance record for a policy evolution stage.
     * Tạo bản ghi nguồn gốc mật mã chống can thiệp cho giai đoạn tiến hóa chính sách.
     */
    generateProvenance(input: GenerateEvolutionProvenanceInput): PolicyEvolutionProvenanceRecord;
    /**
     * Cryptographically verifies a provenance record against constituent evaluation results.
     * Returns true only if recalculated SHA-256 seal matches exactly.
     * Xác minh mật mã một bản ghi nguồn gốc so với các kết quả đánh giá cấu thành.
     */
    verifyProvenance(record: PolicyEvolutionProvenanceRecord, proposal: PolicyEvolutionProposal, simulationResult: CounterfactualSimulationResult, guardrailResult: GuardrailCalibrationResult, reviewRecord?: PolicyReviewRecord): boolean;
}
