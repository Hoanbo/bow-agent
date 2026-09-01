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
export declare class ToolRegistry {
    private tools;
    register(tool: ToolDefinition): void;
    getTool(name: string): ToolDefinition | undefined;
    getAllTools(): ToolDefinition[];
    hasTool(name: string): boolean;
    executeTool(name: string, args: any, context?: any): Promise<any>;
}
export declare const toolRegistry: ToolRegistry;
