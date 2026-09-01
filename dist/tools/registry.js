// src/tools/registry.ts
// BOW AGENT V3.3 — EXTENSIBLE TOOL REGISTRY & SCHEMA VALIDATION
export class ToolRegistry {
    tools = new Map();
    register(tool) {
        this.tools.set(tool.name, tool);
    }
    getTool(name) {
        return this.tools.get(name);
    }
    getAllTools() {
        return Array.from(this.tools.values());
    }
    hasTool(name) {
        return this.tools.has(name);
    }
    async executeTool(name, args, context) {
        const tool = this.tools.get(name);
        if (!tool) {
            throw new Error(`Tool "${name}" is not registered in ToolRegistry.`);
        }
        // Basic schema validation for required fields
        if (tool.parameters.required) {
            for (const req of tool.parameters.required) {
                if (args === undefined || args[req] === undefined) {
                    throw new Error(`Missing required parameter "${req}" for tool "${name}".`);
                }
            }
        }
        return await tool.execute(args, context);
    }
}
export const toolRegistry = new ToolRegistry();
