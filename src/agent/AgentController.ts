/**
 * GH0ST_B0Y Agent Controller
 * Main agent loop - handles input, LLM calls, and tool execution
 * In Memory of GHOST - April 7, 2025
 */

import * as vscode from 'vscode';
import { OllamaClient } from './OllamaClient';
import { ContextManager } from './ContextManager';
import { ToolExecutor } from './ToolExecutor';
import { buildSystemPrompt, formatToolResult, PromptContext } from './PromptBuilder';
import { AgentState, PendingConfirmation, ToolResult, Message } from '../types/agent';

const MAX_TOOL_ITERATIONS = 10;

export interface AgentCallbacks {
    onToken: (token: string) => void;
    onToolExecution: (toolName: string, params: Record<string, unknown>) => void;
    onToolResult: (result: ToolResult) => void;
    onConfirmationNeeded: (pending: PendingConfirmation) => void;
    onError: (error: string) => void;
    onComplete: (fullResponse: string) => void;
    onStateChange: (state: AgentState) => void;
}

export class AgentController {
    private ollamaClient: OllamaClient;
    private contextManager: ContextManager;
    private toolExecutor: ToolExecutor;
    private state: AgentState;
    private callbacks: Partial<AgentCallbacks>;
    private systemPrompt: string;
    private abortController: AbortController | null = null;

    constructor(
        context: vscode.ExtensionContext,
        callbacks?: Partial<AgentCallbacks>
    ) {
        this.ollamaClient = new OllamaClient();
        this.contextManager = new ContextManager(context);
        this.toolExecutor = new ToolExecutor();
        this.callbacks = callbacks || {};
        this.state = { isProcessing: false };

        // Build system prompt with workspace context
        const promptContext = this.getWorkspaceContext();
        this.systemPrompt = buildSystemPrompt(promptContext);
    }

    /**
     * Initialize the agent (load history, check Ollama)
     */
    async initialize(): Promise<boolean> {
        await this.contextManager.load();

        const isRunning = await this.ollamaClient.isRunning();
        if (!isRunning) {
            this.callbacks.onError?.('Ollama is not running. Start it with: ollama serve');
            return false;
        }

        return true;
    }

    /**
     * Process a user message through the agent loop
     */
    async processMessage(userMessage: string): Promise<void> {
        if (this.state.isProcessing) {
            this.callbacks.onError?.('Agent is already processing a message');
            return;
        }

        this.setState({ isProcessing: true });
        this.abortController = new AbortController();

        try {
            // Add user message to context
            this.contextManager.addUserMessage(userMessage);

            // Start the agent loop
            await this.agentLoop();

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.callbacks.onError?.(errorMsg);
        } finally {
            this.setState({ isProcessing: false });
            this.abortController = null;
            await this.contextManager.save();
        }
    }

    /**
     * Main agent loop - generates response and handles tool calls
     */
    private async agentLoop(): Promise<void> {
        let iterations = 0;

        while (iterations < MAX_TOOL_ITERATIONS) {
            iterations++;

            // Build the prompt from history
            const prompt = this.contextManager.buildPrompt();

            // Generate response with streaming
            let fullResponse = '';

            try {
                const result = await this.ollamaClient.generateWithCallback(
                    prompt,
                    this.systemPrompt,
                    (token) => {
                        fullResponse += token;
                        // Only stream text before tool calls
                        if (!this.toolExecutor.hasToolCalls(fullResponse)) {
                            this.callbacks.onToken?.(token);
                        }
                    },
                    this.contextManager.getOllamaContext()
                );

                // Save context for continuation
                if (result.context) {
                    this.contextManager.setOllamaContext(result.context);
                }
            } catch (error) {
                throw new Error(`LLM generation failed: ${error instanceof Error ? error.message : error}`);
            }

            // Check for tool calls
            const toolCalls = this.toolExecutor.parseToolCalls(fullResponse);

            if (toolCalls.length === 0) {
                // No tool calls - we're done
                this.contextManager.addAssistantMessage(fullResponse);
                this.callbacks.onComplete?.(fullResponse);
                return;
            }

            // Get text before the first tool call
            const textBeforeTools = this.toolExecutor.getTextBeforeToolCall(fullResponse);
            if (textBeforeTools) {
                // Stream any text that came before the tool call
                this.callbacks.onToken?.(textBeforeTools);
            }

            // Process each tool call (usually just one per iteration)
            for (const toolCall of toolCalls) {
                // Validate tool call
                const validationError = this.toolExecutor.validateToolCall(toolCall);
                if (validationError) {
                    this.callbacks.onError?.(validationError);
                    continue;
                }

                this.callbacks.onToolExecution?.(toolCall.tool, toolCall.params);
                this.setState({ currentToolCall: toolCall });

                // Execute the tool (may require confirmation)
                const result = await this.toolExecutor.execute(
                    toolCall,
                    (pending) => {
                        this.setState({ pendingConfirmation: pending });
                        this.callbacks.onConfirmationNeeded?.(pending);
                    }
                );

                this.callbacks.onToolResult?.(result);
                this.setState({ currentToolCall: undefined, pendingConfirmation: undefined });

                // Add the assistant message with tool call
                this.contextManager.addAssistantMessage(
                    textBeforeTools || `Using tool: ${toolCall.tool}`,
                    [toolCall]
                );

                // Add tool result to context
                this.contextManager.addToolResult(result);

                // Format result message for the LLM
                const resultText = formatToolResult(
                    toolCall.tool,
                    result.success ? result.output : (result.error || 'Unknown error'),
                    result.success
                );

                // Stream a summary of the tool execution
                this.callbacks.onToken?.(`\n\n[Executed ${toolCall.tool}]\n`);
            }

            // Continue the loop to let the LLM respond to tool results
        }

        // If we hit max iterations, inform the user
        this.callbacks.onError?.(`Reached maximum tool iterations (${MAX_TOOL_ITERATIONS}). Stopping.`);
    }

    /**
     * Stop the current processing
     */
    stop(): void {
        if (this.abortController) {
            this.abortController.abort();
        }
        this.setState({ isProcessing: false });
    }

    /**
     * Confirm pending tool execution
     */
    async confirmTool(): Promise<void> {
        await this.toolExecutor.confirmPending();
    }

    /**
     * Reject pending tool execution
     */
    rejectTool(): void {
        this.toolExecutor.rejectPending();
    }

    /**
     * Clear conversation history
     */
    async clearHistory(): Promise<void> {
        await this.contextManager.clear();
    }

    /**
     * Get current messages
     */
    getMessages(): Message[] {
        return this.contextManager.getMessages();
    }

    /**
     * Get current state
     */
    getState(): AgentState {
        return { ...this.state };
    }

    /**
     * Set the model to use
     */
    setModel(model: string): void {
        this.ollamaClient.setModel(model);
    }

    /**
     * Get available models
     */
    async getAvailableModels(): Promise<string[]> {
        const models = await this.ollamaClient.listModels();
        return models.map(m => m.name);
    }

    /**
     * Get current model
     */
    getCurrentModel(): string {
        return this.ollamaClient.getConfig().model;
    }

    /**
     * Update state and notify
     */
    private setState(updates: Partial<AgentState>): void {
        this.state = { ...this.state, ...updates };
        this.callbacks.onStateChange?.(this.state);
    }

    /**
     * Get workspace context for prompts
     */
    private getWorkspaceContext(): PromptContext {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const editor = vscode.window.activeTextEditor;

        return {
            workspaceName: workspaceFolders?.[0]?.name,
            currentFile: editor?.document.fileName,
            selectedText: editor?.document.getText(editor.selection),
        };
    }
}
