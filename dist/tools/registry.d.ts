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
    register(tool: ToolDefinition): void;
    getTool(name: string): ToolDefinition | undefined;
    getAllTools(): ToolDefinition[];
    hasTool(name: string): boolean;
    /**
     * Execute tool with authoritative Level 4 governance boundary:
     * 1. Schema parameter validation
     * 2. Context / Actor resolution (with default safe owner context)
     * 3. Atomic Idempotency Check (cached replay or conflict detection)
     * 4. Central PDP Policy & Approval Evaluation
     * 5. Tool Execution
     * 6. Idempotency Recording
     * 7. Cryptographic Audit Ledger Recording (Fail-closed)
     */
    executeTool(name: string, args?: any, context?: ToolExecutionContext): Promise<any>;
    private resolveDomain;
}
export declare const toolRegistry: ToolRegistry;
