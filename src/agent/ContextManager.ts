/**
 * GH0ST_B0Y Context Manager
 * Manages conversation history and context
 * In Memory of GHOST - April 7, 2025
 */

import * as vscode from 'vscode';
import { Message, ToolCall, ToolResult } from '../types/agent';

const MAX_HISTORY_LENGTH = 50;
const MAX_CONTEXT_TOKENS = 4000; // Approximate, for context management

export class ContextManager {
    private messages: Message[] = [];
    private context: vscode.ExtensionContext;
    private storageKey: string;
    private ollamaContext?: number[]; // For Ollama's context window

    constructor(context: vscode.ExtensionContext, storageKey: string = 'ghostBoyChat') {
        this.context = context;
        this.storageKey = storageKey;
    }

    /**
     * Load chat history from storage
     */
    async load(): Promise<void> {
        const saved = this.context.globalState.get<Message[]>(this.storageKey);
        if (saved && Array.isArray(saved)) {
            this.messages = saved.slice(-MAX_HISTORY_LENGTH);
        }
    }

    /**
     * Save chat history to storage
     */
    async save(): Promise<void> {
        await this.context.globalState.update(this.storageKey, this.messages);
    }

    /**
     * Add a user message
     */
    addUserMessage(content: string): Message {
        const message: Message = {
            role: 'user',
            content,
            timestamp: Date.now(),
        };
        this.messages.push(message);
        this.trimHistory();
        return message;
    }

    /**
     * Add an assistant message
     */
    addAssistantMessage(content: string, toolCalls?: ToolCall[]): Message {
        const message: Message = {
            role: 'assistant',
            content,
            timestamp: Date.now(),
            toolCalls,
        };
        this.messages.push(message);
        this.trimHistory();
        return message;
    }

    /**
     * Add a tool result message
     */
    addToolResult(toolResult: ToolResult): Message {
        const message: Message = {
            role: 'tool',
            content: toolResult.success
                ? toolResult.output
                : `Error: ${toolResult.error}`,
            timestamp: Date.now(),
            toolResults: [toolResult],
        };
        this.messages.push(message);
        this.trimHistory();
        return message;
    }

    /**
     * Add a system message
     */
    addSystemMessage(content: string): Message {
        const message: Message = {
            role: 'system',
            content,
            timestamp: Date.now(),
        };
        this.messages.push(message);
        this.trimHistory();
        return message;
    }

    /**
     * Get all messages
     */
    getMessages(): Message[] {
        return [...this.messages];
    }

    /**
     * Get recent messages for prompt
     */
    getRecentMessages(count?: number): Message[] {
        const limit = count || MAX_HISTORY_LENGTH;
        return this.messages.slice(-limit);
    }

    /**
     * Build the full prompt from history
     */
    buildPrompt(): string {
        const parts: string[] = [];

        for (const msg of this.messages) {
            switch (msg.role) {
                case 'user':
                    parts.push(`Human: ${msg.content}`);
                    break;
                case 'assistant':
                    parts.push(`Assistant: ${msg.content}`);
                    break;
                case 'tool':
                    parts.push(`[Tool Result]\n${msg.content}`);
                    break;
                case 'system':
                    // System messages are typically not included in visible history
                    break;
            }
        }

        return parts.join('\n\n');
    }

    /**
     * Get/set Ollama context for continuation
     */
    getOllamaContext(): number[] | undefined {
        return this.ollamaContext;
    }

    setOllamaContext(context: number[]): void {
        this.ollamaContext = context;
    }

    /**
     * Clear context (but optionally keep history)
     */
    clearContext(): void {
        this.ollamaContext = undefined;
    }

    /**
     * Clear all history
     */
    async clear(): Promise<void> {
        this.messages = [];
        this.ollamaContext = undefined;
        await this.save();
    }

    /**
     * Get the last message
     */
    getLastMessage(): Message | undefined {
        return this.messages[this.messages.length - 1];
    }

    /**
     * Get the last assistant message
     */
    getLastAssistantMessage(): Message | undefined {
        for (let i = this.messages.length - 1; i >= 0; i--) {
            if (this.messages[i].role === 'assistant') {
                return this.messages[i];
            }
        }
        return undefined;
    }

    /**
     * Update the last assistant message (for streaming)
     */
    updateLastAssistantMessage(content: string): void {
        for (let i = this.messages.length - 1; i >= 0; i--) {
            if (this.messages[i].role === 'assistant') {
                this.messages[i].content = content;
                return;
            }
        }
    }

    /**
     * Trim history to maximum length
     */
    private trimHistory(): void {
        if (this.messages.length > MAX_HISTORY_LENGTH) {
            // Keep the most recent messages
            this.messages = this.messages.slice(-MAX_HISTORY_LENGTH);
        }
    }

    /**
     * Estimate token count for context management
     */
    estimateTokenCount(): number {
        // Rough estimate: ~4 chars per token
        const totalChars = this.messages.reduce((sum, msg) => sum + msg.content.length, 0);
        return Math.ceil(totalChars / 4);
    }

    /**
     * Check if we should compress/summarize history
     */
    shouldCompress(): boolean {
        return this.estimateTokenCount() > MAX_CONTEXT_TOKENS;
    }

    /**
     * Export history for debugging
     */
    export(): string {
        return JSON.stringify(this.messages, null, 2);
    }
}
