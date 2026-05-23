/**
 * GH0ST_B0Y Agent Type Definitions
 * In Memory of GHOST - April 7, 2025
 */

// ═══════════════════════════════════════════════════════════════════════════
// Message Types
// ═══════════════════════════════════════════════════════════════════════════

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface Message {
    role: MessageRole;
    content: string;
    timestamp: number;
    toolCalls?: ToolCall[];
    toolResults?: ToolResult[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Tool Types
// ═══════════════════════════════════════════════════════════════════════════

export interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, ParameterDefinition>;
    requiresConfirmation: boolean;
}

export interface ParameterDefinition {
    type: 'string' | 'number' | 'boolean' | 'array';
    description: string;
    required: boolean;
    default?: unknown;
}

export interface ToolCall {
    tool: string;
    params: Record<string, unknown>;
    id: string;
}

export interface ToolResult {
    toolCallId: string;
    success: boolean;
    output: string;
    error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Ollama Types
// ═══════════════════════════════════════════════════════════════════════════

export interface OllamaConfig {
    baseUrl: string;
    model: string;
    timeout: number;
}

export interface OllamaGenerateRequest {
    model: string;
    prompt: string;
    system?: string;
    stream: boolean;
    context?: number[];
    options?: OllamaOptions;
}

export interface OllamaOptions {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    stop?: string[];
}

export interface OllamaGenerateResponse {
    model: string;
    response: string;
    done: boolean;
    context?: number[];
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    eval_count?: number;
}

export interface OllamaTagsResponse {
    models: OllamaModel[];
}

export interface OllamaModel {
    name: string;
    modified_at: string;
    size: number;
    digest: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Agent Types
// ═══════════════════════════════════════════════════════════════════════════

export interface AgentState {
    isProcessing: boolean;
    currentToolCall?: ToolCall;
    pendingConfirmation?: PendingConfirmation;
    error?: string;
}

export interface PendingConfirmation {
    toolCall: ToolCall;
    preview: string;
    onConfirm: () => Promise<void>;
    onReject: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Chat Panel Types
// ═══════════════════════════════════════════════════════════════════════════

export interface ChatPanelMessage {
    type: 'userMessage' | 'assistantMessage' | 'toolExecution' | 'error' | 'streamToken' | 'confirmTool' | 'confirmResult' | 'clear';
    content?: string;
    toolCall?: ToolCall;
    toolResult?: ToolResult;
    confirmed?: boolean;
}

export interface WebviewMessage {
    command: 'sendMessage' | 'confirmTool' | 'rejectTool' | 'clearHistory' | 'selectModel';
    text?: string;
    toolCallId?: string;
    model?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Security Types
// ═══════════════════════════════════════════════════════════════════════════

export interface SecurityConfig {
    blockedCommands: string[];
    blockedPatterns: RegExp[];
    maxFileSize: number;
    allowedExtensions: string[];
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
    blockedCommands: [
        'rm -rf /',
        'rm -rf ~',
        'rm -rf *',
        'sudo rm',
        'mkfs',
        'dd if=',
        ':(){:|:&};:',  // Fork bomb
        'chmod -R 777 /',
        '> /dev/sda',
        'curl | sh',
        'curl | bash',
        'wget | sh',
        'wget | bash',
    ],
    blockedPatterns: [
        /sudo\s+rm\s+-rf/i,
        />\s*\/dev\/sd[a-z]/i,
        /curl\s+.*\|\s*(ba)?sh/i,
        /wget\s+.*\|\s*(ba)?sh/i,
        /:()\s*{\s*:\s*\|\s*:\s*&\s*}\s*;\s*:/,  // Fork bomb pattern
    ],
    maxFileSize: 10 * 1024 * 1024,  // 10 MB
    allowedExtensions: [
        '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt',
        '.py', '.rs', '.go', '.sol', '.toml', '.yaml', '.yml',
        '.html', '.css', '.scss', '.less', '.sh', '.bash',
        '.env.example', '.gitignore', '.dockerignore',
    ],
};
