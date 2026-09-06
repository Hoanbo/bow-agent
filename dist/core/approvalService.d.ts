import { DurableJsonStore } from './persistence/durableJsonStore.js';
import type { ApprovalRecord, ApprovalStatus } from './persistence/governanceSchemas.js';
export type { ApprovalRecord, ApprovalStatus };
export declare class ApprovalService {
    readonly baseDir: string;
    readonly legacyFilePath: string;
    private singleFileOverride?;
    private stores;
    private tokenToUserIndex;
    private approvalToUserIndex;
    constructor(customBaseDirOrFilePath?: string, customLegacyFilePathOrAllowedDir?: string);
    /**
     * Resolve or initialize the isolated DurableJsonStore for the specified user.
     */
    getStore(userId?: string): DurableJsonStore<ApprovalRecord[]>;
    /**
     * Request a new human approval for a HIGH_IMPACT action
     */
    requestApproval(params: {
        actionName: string;
        targetDomain: 'shop' | 'desktop' | 'robot' | 'system' | 'dynamic_code';
        arguments: Record<string, any>;
        requestedBy: string;
        userId?: string;
        ttlSeconds?: number;
        correlationId?: string;
    }): ApprovalRecord;
    /**
     * Grant approval by authorized human (Boss / Admin) and generate a single-use execution token
     */
    grantApproval(approvalId: string, approver: string, userId?: string): {
        success: boolean;
        executionToken?: string;
        error?: string;
    };
    /**
     * Reject an approval request
     */
    rejectApproval(approvalId: string, rejector: string, userId?: string): boolean;
    /**
     * Revoke an approved or pending approval
     */
    revokeApproval(approvalId: string, reason?: string, userId?: string): boolean;
    /**
     * Validate an execution token without consuming it.
     */
    validateToken(token: string, actionName: string, args: Record<string, any>, userId?: string): {
        valid: boolean;
        reason?: string;
        record?: ApprovalRecord;
    };
    /**
     * Consume an approved token by transitioning its status to CONSUMED.
     */
    consumeToken(token: string, userId?: string): boolean;
    /**
     * Validate and consume a one-time execution token.
     * If userId is specified, scopes strictly to the authenticated user's partition.
     */
    validateAndConsumeToken(token: string, actionName: string, args: Record<string, any>, userId?: string): {
        valid: boolean;
        reason?: string;
        record?: ApprovalRecord;
    };
    getApproval(approvalId: string, userId?: string): ApprovalRecord | undefined;
    getAllApprovals(userId?: string): ApprovalRecord[];
    listApprovals(filter?: {
        status?: ApprovalStatus;
        domain?: string;
        userId?: string;
    }): ApprovalRecord[];
    listPending(userId?: string): ApprovalRecord[];
}
export declare const globalApprovalService: ApprovalService;
