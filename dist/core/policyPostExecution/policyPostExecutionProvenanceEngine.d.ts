import type { ExecutionId } from '../policyExecution/policyExecutionTypes.js';
import { type PostExecutionProvenanceRecord, type PolicyPostExecutionOptions } from './policyPostExecutionTypes.js';
export declare const GENESIS_POST_EXECUTION_HASH = "0000000000000000000000000000000000000000000000000000000000000000";
export declare class PolicyPostExecutionProvenanceEngine {
    private readonly chains;
    private readonly baseDir;
    constructor(options?: PolicyPostExecutionOptions);
    private validateTenant;
    /**
     * Appends a post-execution governance transition record to the hash chain.
     * Thêm một bản ghi chuyển đổi quản trị sau thực thi vào chuỗi băm.
     */
    recordTransition(input: {
        readonly executionId: ExecutionId;
        readonly tenantPartition: string;
        readonly eventType: string;
        readonly detailsPayload?: Record<string, any>;
    }): PostExecutionProvenanceRecord;
    /**
     * Cryptographically verifies the integrity of a post-execution provenance chain.
     * Xác minh tính toàn vẹn mật mã của chuỗi nguồn gốc sau thực thi.
     */
    verifyChain(executionId: ExecutionId): {
        readonly valid: boolean;
        readonly recordCount: number;
        readonly headHash?: string;
        readonly reason?: string;
    };
    getChain(executionId: ExecutionId): readonly PostExecutionProvenanceRecord[];
}
export declare const globalPolicyPostExecutionProvenanceEngine: PolicyPostExecutionProvenanceEngine;
