import type { WorldAction, AuthorizationToken } from './worldActionTypes.js';
export interface ActionConfirmationRequest {
    readonly confirmationId: string;
    readonly actionId: string;
    readonly userId: string;
    readonly deviceId: string;
    readonly toolId: string;
    readonly target: string;
    readonly riskLevel: string;
    readonly parameters: Record<string, any>;
    readonly requestedAt: number;
    readonly expiresAt: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
}
export declare class WorldActionApprovalManager {
    private pendingRequests;
    createConfirmationRequest(action: WorldAction, ttlMs?: number): ActionConfirmationRequest;
    approve(confirmationId: string, approverUserId: string): AuthorizationToken;
    reject(confirmationId: string, reason?: string): void;
    getRequest(confirmationId: string): ActionConfirmationRequest | undefined;
    clear(): void;
}
export declare const globalWorldActionApproval: WorldActionApprovalManager;
