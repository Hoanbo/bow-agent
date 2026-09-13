import { AuditLedger } from '../auditLedger.js';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export type PolicyExecutionAuditEventType = 'EXECUTION_REQUESTED' | 'EXECUTION_VALIDATED' | 'EXECUTION_BLOCKED' | 'EXECUTION_STARTED' | 'EXECUTION_SUCCEEDED' | 'EXECUTION_FAILED' | 'EXECUTION_PARTIAL' | 'EXECUTION_UNKNOWN' | 'EXECUTION_RECOVERED' | 'EXECUTION_DUPLICATE_BLOCKED' | 'EXECUTION_USER_STOP_BLOCKED' | 'EXECUTION_CIRCUIT_BREAKER_BLOCKED' | 'EXECUTION_HARD_FORBIDDEN_BLOCKED';
export interface PolicyExecutionAuditRecord {
    readonly eventType: PolicyExecutionAuditEventType;
    readonly tenantPartition: string;
    readonly executionId?: string;
    readonly envelopeId?: string;
    readonly proposalId?: string;
    readonly operatorUserId?: string;
    readonly actionType?: string;
    readonly status?: string;
    readonly reason?: string;
    readonly details?: Record<string, any>;
    readonly durationMs?: number;
}
export interface PolicyExecutionAuditEngineOptions {
    readonly auditLedger?: AuditLedger;
    readonly sanitizer?: DiagnosisSanitizer;
}
export declare class PolicyExecutionAuditEngine {
    private readonly auditLedger;
    private readonly sanitizer;
    constructor(options?: PolicyExecutionAuditEngineOptions);
    /**
     * Records a sanitized execution audit event into the append-only ledger.
     * Ghi lại một sự kiện kiểm toán thực thi đã được làm sạch vào sổ cái chỉ ghi thêm.
     */
    recordEvent(record: PolicyExecutionAuditRecord): void;
}
export declare const globalPolicyExecutionAuditEngine: PolicyExecutionAuditEngine;
