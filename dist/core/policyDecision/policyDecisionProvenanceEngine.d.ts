import { type DecisionId, type DecisionProposalId, type DecisionProvenanceRecord } from './policyDecisionTypes.js';
export declare const GENESIS_DECISION_HASH = "0000000000000000000000000000000000000000000000000000000000000000";
export declare class PolicyDecisionProvenanceEngine {
    private readonly chains;
    /**
     * Appends an event to the cryptographic decision provenance chain.
     * Thêm một sự kiện vào chuỗi nguồn gốc quyết định mật mã.
     */
    recordTransition(input: {
        readonly decisionId: DecisionId;
        readonly proposalId: DecisionProposalId;
        readonly tenantPartition: string;
        readonly eventType: string;
        readonly operatorUserId?: string;
        readonly metadata?: Record<string, any>;
    }): DecisionProvenanceRecord;
    /**
     * Cryptographically verifies the unbroken SHA-256 chain for a decision.
     * Xác minh chuỗi SHA-256 không bị phá vỡ cho một quyết định.
     */
    verifyChain(decisionId: DecisionId): {
        readonly valid: boolean;
        readonly recordCount: number;
        readonly headHash: string;
        readonly reason?: string;
    };
    /**
     * Retrieves the full chain for a decision.
     * Lấy toàn bộ chuỗi cho một quyết định.
     */
    getChain(decisionId: DecisionId): readonly DecisionProvenanceRecord[];
    /**
     * Clears provenance chains for testing.
     * Xóa các chuỗi phục vụ kiểm thử.
     */
    clear(): void;
}
export declare const globalPolicyDecisionProvenanceEngine: PolicyDecisionProvenanceEngine;
