import { GovernedPolicyEnforcementPoint } from '../core/policyEnforcement/index.js';
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, any>;
        required?: string[];
    };
    execute: (args: any, context?: any) => Promise<any>;
}
export interface ToolExecutionContext {
    userId?: string;
    role?: string;
    channel?: string;
    isOwner?: boolean;
    correlationId?: string;
    idempotencyKey?: string;
    executionToken?: string;
    authToken?: string;
    requestedApprovalTimeoutMs?: number;
    retryAttempt?: number;
    actor?: {
        userId?: string;
        role?: string;
        channel?: string;
        isOwner?: boolean;
    };
    [key: string]: any;
}
export declare class ToolRegistry {
    private tools;
    private pep;
    constructor(pep?: GovernedPolicyEnforcementPoint);
    getPEP(): GovernedPolicyEnforcementPoint;
    register(tool: ToolDefinition): void;
    getTool(name: string): ToolDefinition | undefined;
    getAllTools(): ToolDefinition[];
    hasTool(name: string): boolean;
    /**
     * Execute tool with authoritative Level 4 governance boundary:
     * 1. Auth/Context Resolution
     * 2. Atomic Idempotency Check
     * 3. Governed Policy Enforcement Point (PEP) Verification
     * 4. Approval Verification
     * 5. Execution
     * 6. Idempotency Store Commit
     * 7. Append-Only Audit Ledger
     */
    executeTool(name: string, args?: Record<string, any>, context?: ToolExecutionContext): Promise<any>;
    private resolveDomain;
}
export declare const toolRegistry: ToolRegistry;
