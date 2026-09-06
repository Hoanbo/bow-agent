import { ValidationResult } from './durableJsonStore.js';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CONSUMED' | 'REVOKED';
export interface ApprovalRecord {
    id: string;
    ownerUserId: string;
    actionName: string;
    targetDomain: 'shop' | 'desktop' | 'robot' | 'system' | 'dynamic_code';
    argumentsHash: string;
    argumentsPreview: Record<string, any>;
    requestedBy: string;
    approver?: string;
    status: ApprovalStatus;
    createdAt: string;
    expiresAt: string;
    consumedAt?: string;
    executionToken?: string;
    correlationId?: string;
}
export type IdempotencyStatus = 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
export interface IdempotencyEntry {
    key: string;
    ownerUserId: string;
    status?: IdempotencyStatus;
    payloadHash: string;
    result: any;
    recordedAt: number;
    updatedAt?: number;
    expiresAt: number;
    correlationId?: string;
}
/**
 * Runtime schema validator for ApprovalRecord[]
 */
export declare function validateApprovalRecords(data: unknown): ValidationResult<ApprovalRecord[]>;
/**
 * Runtime schema validator for IdempotencyEntry[]
 */
export declare function validateIdempotencyEntries(data: unknown): ValidationResult<IdempotencyEntry[]>;
