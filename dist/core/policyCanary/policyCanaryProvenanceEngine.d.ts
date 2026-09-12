import { type CanaryProvenanceRecord, type PolicyCandidateId, type PolicyRing } from './policyCanaryTypes.js';
export declare const GENESIS_CANARY_HASH = "0000000000000000000000000000000000000000000000000000000000000000";
export declare class PolicyCanaryProvenanceEngine {
    private readonly chains;
    /**
     * Appends a new verified event to the cryptographic provenance chain.
     * Thêm một sự kiện mới đã được xác minh vào chuỗi nguồn gốc mật mã.
     */
    recordEvent(input: {
        readonly candidateId: PolicyCandidateId;
        readonly tenantPartition: string;
        readonly ring: PolicyRing;
        readonly eventType: string;
        readonly candidatePolicyVersion: string;
        readonly evidenceReference?: string;
        readonly authorizationReference?: string;
    }): CanaryProvenanceRecord;
    /**
     * Cryptographically verifies the unbroken SHA-256 chain for a candidate.
     * Xác minh chuỗi SHA-256 không bị phá vỡ theo mật mã học cho một ứng viên.
     */
    verifyChain(candidateId: PolicyCandidateId): {
        readonly valid: boolean;
        readonly recordCount: number;
        readonly headHash: string;
        readonly reason?: string;
    };
    /**
     * Retrieves the full provenance chain for a candidate.
     * Lấy toàn bộ chuỗi nguồn gốc cho một ứng viên.
     */
    getChain(candidateId: PolicyCandidateId): readonly CanaryProvenanceRecord[];
    /**
     * Clears chain for testing.
     * Xóa chuỗi phục vụ kiểm thử.
     */
    clear(): void;
}
export declare const globalPolicyCanaryProvenanceEngine: PolicyCanaryProvenanceEngine;
