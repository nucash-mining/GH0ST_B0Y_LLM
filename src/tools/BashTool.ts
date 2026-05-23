/**
 * GH0ST_B0Y Bash Tool
 * Execute shell commands (requires confirmation)
 * In Memory of GHOST - April 7, 2025
 */

import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';
import { ToolDefinition, DEFAULT_SECURITY_CONFIG } from '../types/agent';
import { Tool } from './index';

export class BashTool implements Tool {
    definition: ToolDefinition = {
        name: 'run_command',
        description: 'Execute a shell command in the workspace directory. REQUIRES USER CONFIRMATION before execution. Output is limited to prevent overflow.',
        parameters: {
            command: {
                type: 'string',
                description: 'The shell command to execute',
                required: true,
            },
            cwd: {
                type: 'string',
                description: 'Working directory (relative to workspace root)',
                required: false,
            },
            timeout: {
                type: 'number',
                description: 'Timeout in milliseconds (default: 30000)',
                required: false,
                default: 30000,
            },
        },
        requiresConfirmation: true,
    };

    async execute(params: Record<string, unknown>): Promise<string> {
        const command = params.command as string;
        const cwdParam = params.cwd as string | undefined;
        const timeout = (params.timeout as number) || 30000;

        if (!command) {
            throw new Error('Command is required');
        }

        // Security check
        const securityError = this.checkCommandSafety(command);
        if (securityError) {
            throw new Error(securityError);
        }

        // Resolve working directory
        const cwd = this.resolveWorkingDirectory(cwdParam);

        try {
            const result = child_process.execSync(command, {
                cwd,
                timeout,
                encoding: 'utf-8',
                maxBuffer: 1024 * 1024, // 1MB
                shell: '/bin/bash',
            });

            // Truncate output if too long
            const maxOutput = 10000;
            if (result.length > maxOutput) {
                return result.slice(0, maxOutput) + `\n\n[Output truncated at ${maxOutput} characters]`;
            }

            return result || '(command completed with no output)';
        } catch (error: unknown) {
            if (error instanceof Error) {
                const execError = error as child_process.ExecException & { stdout?: string; stderr?: string };

                // Include stderr in error message
                let errorMsg = `Command failed: ${execError.message}`;
                if (execError.stderr) {
                    errorMsg += `\n\nStderr:\n${execError.stderr.slice(0, 2000)}`;
                }
                if (execError.stdout) {
                    errorMsg += `\n\nStdout:\n${execError.stdout.slice(0, 2000)}`;
                }
                throw new Error(errorMsg);
            }
            throw error;
        }
    }

    /**
     * Generate a preview for confirmation UI
     */
    async getPreview(params: Record<string, unknown>): Promise<string> {
        const command = params.command as string;
        const cwdParam = params.cwd as string | undefined;
        const cwd = this.resolveWorkingDirectory(cwdParam);

        const workspaceFolders = vscode.workspace.workspaceFolders;
        const workspaceRoot = workspaceFolders?.[0]?.uri.fsPath || '';
        const relativeCwd = cwd.startsWith(workspaceRoot)
            ? path.relative(workspaceRoot, cwd) || '.'
            : cwd;

        // Check for potentially dangerous commands
        const warnings: string[] = [];

        if (command.includes('rm ')) {
            warnings.push('WARNING: This command may delete files');
        }
        if (command.includes('sudo')) {
            warnings.push('WARNING: This command uses sudo');
        }
        if (command.includes('>') || command.includes('>>')) {
            warnings.push('WARNING: This command may modify files');
        }
        if (command.includes('|')) {
            warnings.push('NOTE: This is a piped command');
        }

        let preview = `COMMAND: ${command}\n`;
        preview += `DIRECTORY: ${relativeCwd}\n`;

        if (warnings.length > 0) {
            preview += `\n${warnings.join('\n')}\n`;
        }

        return preview;
    }

    private resolveWorkingDirectory(cwdParam?: string): string {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const workspaceRoot = workspaceFolders?.[0]?.uri.fsPath || process.cwd();

        if (!cwdParam) {
            return workspaceRoot;
        }

        if (path.isAbsolute(cwdParam)) {
            return cwdParam;
        }

        return path.join(workspaceRoot, cwdParam);
    }

    private checkCommandSafety(command: string): string | null {
        // Normalize command for checking
        const normalizedCmd = command.toLowerCase().replace(/\s+/g, ' ').trim();

        // Check blocked commands (exact matches)
        for (const blocked of DEFAULT_SECURITY_CONFIG.blockedCommands) {
            if (normalizedCmd.includes(blocked.toLowerCase())) {
                return `Blocked command detected: "${blocked}". This command is not allowed for safety reasons.`;
            }
        }

        // Check blocked patterns (regex)
        for (const pattern of DEFAULT_SECURITY_CONFIG.blockedPatterns) {
            if (pattern.test(command)) {
                return `Blocked command pattern detected. This type of command is not allowed for safety reasons.`;
            }
        }

        // Additional safety checks
        const additionalBlocked = [
            // Destructive operations
            /rm\s+-[rf]+\s+[\/~]/i,
            /rm\s+--no-preserve-root/i,

            // System modifications
            /chmod\s+-R\s+777\s+\//i,
            /chown\s+-R\s+.*\s+\//i,

            // Network exfiltration patterns
            /curl\s+.*\s+\|\s*(ba)?sh/i,
            /wget\s+.*\s+\|\s*(ba)?sh/i,

            // Disk operations
            /dd\s+if=.*of=\/dev/i,
            /mkfs/i,

            // Fork bombs and similar
            /:\(\)\s*\{/,

            // Environment manipulation
            /export\s+PATH=/i,
            /unset\s+PATH/i,
        ];

        for (const pattern of additionalBlocked) {
            if (pattern.test(command)) {
                return `Potentially dangerous command pattern detected. This command requires manual execution.`;
            }
        }

        return null;
    }
}
