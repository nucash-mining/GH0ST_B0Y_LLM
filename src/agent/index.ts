/**
 * GH0ST_B0Y Agent Module
 * Exports all agent components
 * In Memory of GHOST - April 7, 2025
 */

export { OllamaClient, checkOllamaStatus } from './OllamaClient';
export { AgentController } from './AgentController';
export { ContextManager } from './ContextManager';
export { ToolExecutor } from './ToolExecutor';
export { buildSystemPrompt, buildCodingPrompt, formatToolResult } from './PromptBuilder';
