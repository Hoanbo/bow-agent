import type { WorldToolDefinition } from './worldActionTypes.js';
export declare class WorldActionRegistry {
    private tools;
    constructor();
    register(tool: WorldToolDefinition): void;
    getTool(toolId: string): WorldToolDefinition | undefined;
    hasTool(toolId: string): boolean;
    getAllTools(): WorldToolDefinition[];
    private registerBuiltinTools;
}
export declare const globalWorldActionRegistry: WorldActionRegistry;
