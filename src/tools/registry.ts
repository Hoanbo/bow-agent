// src/tools/registry.ts
// BOW AGENT V3.3 — EXTENSIBLE TOOL REGISTRY & SCHEMA VALIDATION

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

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  public register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  public hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  public async executeTool(name: string, args: any, context?: any): Promise<any> {
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
