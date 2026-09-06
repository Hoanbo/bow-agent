import { ApprovalService, ApprovalRecord } from './approvalService.js';
import { IdempotencyStore } from './idempotencyStore.js';
import { AuditLedger, AuditEvent } from './auditLedger.js';
export * from './approvalService.js';
export * from './idempotencyStore.js';
export * from './auditLedger.js';
export type ActionClassification = 'OBSERVE' | 'RECOMMEND' | 'REVERSIBLE' | 'HIGH_IMPACT' | 'FORBIDDEN';
export interface PolicyDecision {
    allowed: boolean;
    classification: ActionClassification;
    requiresApproval: boolean;
    reason: string;
    approvalId?: string;
    decisionTimestamp: string;
}
export declare class PolicyDecisionPoint {
    private approvalService;
    private idempotencyStore;
    private auditLedger;
    private globalKillSwitch;
    private domainKillSwitches;
    constructor(customAuditPath?: string, approvalService?: ApprovalService, idempotencyStore?: IdempotencyStore, auditLedger?: AuditLedger);
    setGlobalKillSwitch(active: boolean): void;
    setDomainKillSwitch(domain: 'shop' | 'desktop' | 'robot' | 'dynamic_code', active: boolean): void;
    isEmergencyStopped(domain?: 'shop' | 'desktop' | 'robot' | 'dynamic_code'): boolean;
    getKillSwitchStatus(): {
        global: boolean;
        domains: {
            shop: boolean;
            desktop: boolean;
            robot: boolean;
            dynamic_code: boolean;
        };
    };
    getActionClassification(toolName: string): ActionClassification;
    registerActionPolicy(toolName: string, classification: ActionClassification): void;
    evaluate(params: {
        toolName: string;
        args: Record<string, any>;
        actor: {
            userId?: string;
            role?: string;
            channel?: string;
            isOwner?: boolean;
        };
        executionToken?: string;
        idempotencyKey?: string;
        consumeToken?: boolean;
    }): PolicyDecision;
    requestApproval(params: {
        actionName: string;
        targetDomain: 'shop' | 'desktop' | 'robot' | 'system' | 'dynamic_code';
        arguments: Record<string, any>;
        requestedBy: string;
        userId?: string;
        correlationId?: string;
        ttlSeconds?: number;
    }): ApprovalRecord;
    grantApproval(approvalId: string, approver: string, userId?: string): {
        success: boolean;
        executionToken?: string;
        error?: string;
    };
    rejectApproval(approvalId: string, rejector: string, userId?: string): boolean;
    revokeApproval(approvalId: string, reason?: string, userId?: string): boolean;
    getApproval(approvalId: string, userId?: string): ApprovalRecord | undefined;
    getAllApprovals(userId?: string): ApprovalRecord[];
    checkIdempotency(key?: string, payload?: any, userId?: string): {
        isDuplicate: boolean;
        cachedResult?: any;
        reason?: string;
        conflict?: boolean;
        inProgress?: boolean;
    };
    recordIdempotency(key: string, result: any, payload?: any, ttlMs?: number, userId?: string): void;
    recordAuditEvent(eventData: Omit<AuditEvent, 'eventId' | 'previousHash' | 'signature'>): AuditEvent;
    verifyAuditLedgerIntegrity(): boolean;
    getAuditTrail(): AuditEvent[];
    getApprovalService(): ApprovalService;
    getIdempotencyStore(): IdempotencyStore;
    getAuditLedger(): AuditLedger;
    resolveDomain(toolName: string): 'shop' | 'desktop' | 'robot' | 'dynamic_code';
}
export declare const globalPDP: PolicyDecisionPoint;
