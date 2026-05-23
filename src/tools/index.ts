/**
 * GH0ST_B0Y Tool Registry
 * Central registry for all available agent tools
 * In Memory of GHOST - April 7, 2025
 */

import { ToolDefinition, ToolCall, ToolResult } from '../types/agent';
import { FileReadTool } from './FileReadTool';
import { FileWriteTool } from './FileWriteTool';
import { ListFilesTool } from './ListFilesTool';
import { SearchTool } from './SearchTool';
import { BashTool } from './BashTool';

// ═══════════════════════════════════════════════════════════════════════════
// Tool Interface
// ═══════════════════════════════════════════════════════════════════════════

export interface Tool {
    definition: ToolDefinition;
    execute(params: Record<string, unknown>): Promise<string>;
    getPreview?(params: Record<string, unknown>): Promise<string>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Tool Registry
// ═══════════════════════════════════════════════════════════════════════════

export class ToolRegistry {
    private tools: Map<string, Tool> = new Map();

    constructor() {
        // Register all tools
        this.register(new FileReadTool());
        this.register(new FileWriteTool());
        this.register(new ListFilesTool());
        this.register(new SearchTool());
        this.register(new BashTool());
    }

    register(tool: Tool): void {
        this.tools.set(tool.definition.name, tool);
    }

    get(name: string): Tool | undefined {
        return this.tools.get(name);
    }

    getAll(): Tool[] {
        return Array.from(this.tools.values());
    }

    getDefinitions(): ToolDefinition[] {
        return this.getAll().map(t => t.definition);
    }

    /**
     * Execute a tool call
     */
    async execute(toolCall: ToolCall): Promise<ToolResult> {
        const tool = this.get(toolCall.tool);

        if (!tool) {
            return {
                toolCallId: toolCall.id,
                success: false,
                output: '',
                error: `Unknown tool: ${toolCall.tool}`,
            };
        }

        try {
            const output = await tool.execute(toolCall.params);
            return {
                toolCallId: toolCall.id,
                success: true,
                output,
            };
        } catch (error) {
            return {
                toolCallId: toolCall.id,
                success: false,
                output: '',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    /**
     * Check if a tool requires confirmation
     */
    requiresConfirmation(toolName: string): boolean {
        const tool = this.get(toolName);
        return tool?.definition.requiresConfirmation ?? true;
    }

    /**
     * Get a preview of what a tool will do (for confirmation)
     */
    async getPreview(toolCall: ToolCall): Promise<string> {
        const tool = this.get(toolCall.tool);

        if (!tool) {
            return `Unknown tool: ${toolCall.tool}`;
        }

        if (tool.getPreview) {
            return tool.getPreview(toolCall.params);
        }

        return `Execute ${toolCall.tool} with params: ${JSON.stringify(toolCall.params, null, 2)}`;
    }
}

// Singleton instance
let registryInstance: ToolRegistry | null = null;

export function getToolRegistry(): ToolRegistry {
    if (!registryInstance) {
        registryInstance = new ToolRegistry();
    }
    return registryInstance;
}

/**
 * Generate tool descriptions for the system prompt
 */
export function generateToolDescriptions(): string {
    const registry = getToolRegistry();
    const tools = registry.getDefinitions();

    let description = 'You have access to the following tools:\n\n';

    for (const tool of tools) {
        description += `## ${tool.name}\n`;
        description += `${tool.description}\n`;
        description += `Requires confirmation: ${tool.requiresConfirmation ? 'YES' : 'NO'}\n`;
        description += 'Parameters:\n';

        for (const [paramName, paramDef] of Object.entries(tool.parameters)) {
            const required = paramDef.required ? '(required)' : '(optional)';
            description += `  - ${paramName} (${paramDef.type}) ${required}: ${paramDef.description}\n`;
        }
        description += '\n';
    }

    description += `
## How to call tools

When you need to use a tool, output a tool call in this exact format:

<tool_call>
{"tool": "tool_name", "params": {"param1": "value1", "param2": "value2"}}
</tool_call>

Important:
- Only call ONE tool at a time
- Wait for the tool result before calling another tool
- The tool call must be valid JSON inside the <tool_call> tags
- After receiving a tool result, continue your response based on the result

Example:
<tool_call>
{"tool": "read_file", "params": {"path": "src/main.ts"}}
</tool_call>
`;

    return description;
}
