/**
 * GH0ST_B0Y Tool Executor
 * Parses and executes tool calls from LLM output
 * In Memory of GHOST - April 7, 2025
 */

import * as vscode from 'vscode';
import { ToolCall, ToolResult, PendingConfirmation } from '../types/agent';
import { getToolRegistry } from '../tools';

// Regex to match tool calls in LLM output
const TOOL_CALL_REGEX = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g;

export class ToolExecutor {
    private pendingConfirmation: PendingConfirmation | null = null;
    private toolCallIdCounter = 0;

    /**
     * Parse tool calls from LLM response
     */
    parseToolCalls(response: string): ToolCall[] {
        const toolCalls: ToolCall[] = [];
        let match;

        // Reset regex lastIndex
        TOOL_CALL_REGEX.lastIndex = 0;

        while ((match = TOOL_CALL_REGEX.exec(response)) !== null) {
            try {
                const jsonStr = match[1].trim();
                const parsed = JSON.parse(jsonStr);

                if (parsed.tool && typeof parsed.tool === 'string') {
                    toolCalls.push({
                        tool: parsed.tool,
                        params: parsed.params || {},
                        id: this.generateToolCallId(),
                    });
                }
            } catch (error) {
                console.error('Failed to parse tool call:', error);
                // Continue parsing other tool calls
            }
        }

        return toolCalls;
    }

    /**
     * Check if response contains tool calls
     */
    hasToolCalls(response: string): boolean {
        TOOL_CALL_REGEX.lastIndex = 0;
        return TOOL_CALL_REGEX.test(response);
    }

    /**
     * Extract text before first tool call (for streaming display)
     */
    getTextBeforeToolCall(response: string): string {
        const match = response.match(/<tool_call>/);
        if (match && match.index !== undefined) {
            return response.slice(0, match.index).trim();
        }
        return response;
    }

    /**
     * Extract text after last tool call
     */
    getTextAfterToolCalls(response: string): string {
        TOOL_CALL_REGEX.lastIndex = 0;
        let lastIndex = 0;
        let match;

        while ((match = TOOL_CALL_REGEX.exec(response)) !== null) {
            lastIndex = match.index + match[0].length;
        }

        return response.slice(lastIndex).trim();
    }

    /**
     * Execute a tool call (handles confirmation if needed)
     */
    async execute(
        toolCall: ToolCall,
        onConfirmationNeeded: (pending: PendingConfirmation) => void
    ): Promise<ToolResult> {
        const registry = getToolRegistry();
        const tool = registry.get(toolCall.tool);

        if (!tool) {
            return {
                toolCallId: toolCall.id,
                success: false,
                output: '',
                error: `Unknown tool: ${toolCall.tool}`,
            };
        }

        // Check if confirmation is required
        if (tool.definition.requiresConfirmation) {
            return new Promise((resolve) => {
                const preview = tool.getPreview
                    ? tool.getPreview(toolCall.params)
                    : Promise.resolve(JSON.stringify(toolCall.params, null, 2));

                preview.then((previewText) => {
                    this.pendingConfirmation = {
                        toolCall,
                        preview: previewText,
                        onConfirm: async () => {
                            this.pendingConfirmation = null;
                            const result = await this.executeDirectly(toolCall);
                            resolve(result);
                        },
                        onReject: () => {
                            this.pendingConfirmation = null;
                            resolve({
                                toolCallId: toolCall.id,
                                success: false,
                                output: '',
                                error: 'User rejected the tool execution',
                            });
                        },
                    };

                    onConfirmationNeeded(this.pendingConfirmation);
                });
            });
        }

        // Execute directly if no confirmation needed
        return this.executeDirectly(toolCall);
    }

    /**
     * Execute a tool call directly (no confirmation check)
     */
    async executeDirectly(toolCall: ToolCall): Promise<ToolResult> {
        const registry = getToolRegistry();
        return registry.execute(toolCall);
    }

    /**
     * Confirm pending tool execution
     */
    async confirmPending(): Promise<void> {
        if (this.pendingConfirmation) {
            await this.pendingConfirmation.onConfirm();
        }
    }

    /**
     * Reject pending tool execution
     */
    rejectPending(): void {
        if (this.pendingConfirmation) {
            this.pendingConfirmation.onReject();
        }
    }

    /**
     * Check if there's a pending confirmation
     */
    hasPendingConfirmation(): boolean {
        return this.pendingConfirmation !== null;
    }

    /**
     * Get pending confirmation
     */
    getPendingConfirmation(): PendingConfirmation | null {
        return this.pendingConfirmation;
    }

    /**
     * Generate unique tool call ID
     */
    private generateToolCallId(): string {
        return `tc_${Date.now()}_${++this.toolCallIdCounter}`;
    }

    /**
     * Validate tool call parameters
     */
    validateToolCall(toolCall: ToolCall): string | null {
        const registry = getToolRegistry();
        const tool = registry.get(toolCall.tool);

        if (!tool) {
            return `Unknown tool: ${toolCall.tool}`;
        }

        // Check required parameters
        for (const [paramName, paramDef] of Object.entries(tool.definition.parameters)) {
            if (paramDef.required && !(paramName in toolCall.params)) {
                return `Missing required parameter: ${paramName}`;
            }

            // Type checking
            if (paramName in toolCall.params) {
                const value = toolCall.params[paramName];
                const expectedType = paramDef.type;

                if (expectedType === 'string' && typeof value !== 'string') {
                    return `Parameter ${paramName} should be a string`;
                }
                if (expectedType === 'number' && typeof value !== 'number') {
                    return `Parameter ${paramName} should be a number`;
                }
                if (expectedType === 'boolean' && typeof value !== 'boolean') {
                    return `Parameter ${paramName} should be a boolean`;
                }
                if (expectedType === 'array' && !Array.isArray(value)) {
                    return `Parameter ${paramName} should be an array`;
                }
            }
        }

        return null;
    }
}
