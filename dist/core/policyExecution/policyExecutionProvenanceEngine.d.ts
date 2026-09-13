import { type ExecutionId, type ExecutionProvenanceRecord } from './policyExecutionTypes.js';
import type { DecisionProposalId } from '../policyDecision/policyDecisionTypes.js';
export declare const GENESIS_EXECUTION_HASH = "0000000000000000000000000000000000000000000000000000000000000000";
export interface PolicyExecutionProvenanceEngineOptions {
    readonly baseDir?: string;
}
export declare class PolicyExecutionProvenanceEngine {
    private readonly chains;
    private readonly baseDir;
    constructor(options?: PolicyExecutionProvenanceEngineOptions);
    private validateTenant;
    /**
     * Appends an execution transition record to the cryptographic hash chain.
     * Thêm một bản ghi chuyển đổi thực thi vào chuỗi băm mật mã.
     */
    recordTransition(input: {
        readonly executionId: ExecutionId;
        readonly proposalId: DecisionProposalId;
        readonly tenantPartition: string;
        readonly eventType: string;
        readonly operatorUserId?: string;
    }): ExecutionProvenanceRecord;
    /**
     * Verifies the cryptographic integrity of an execution hash chain.
     * Xác minh tính toàn vẹn mật mã của chuỗi băm thực thi.
     */
    verifyChain(executionId: ExecutionId): {
        readonly valid: boolean;
        readonly recordCount: number;
        readonly headHash?: string;
        readonly reason?: string;
    };
    /**
     * Gets the complete immutable chain for an execution.
     */
    getChain(executionId: ExecutionId): readonly ExecutionProvenanceRecord[];
}
export declare const globalPolicyExecutionProvenanceEngine: PolicyExecutionProvenanceEngine;
