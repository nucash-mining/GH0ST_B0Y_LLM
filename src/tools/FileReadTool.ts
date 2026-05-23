/**
 * GH0ST_B0Y File Read Tool
 * Read file contents from workspace
 * In Memory of GHOST - April 7, 2025
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ToolDefinition, DEFAULT_SECURITY_CONFIG } from '../types/agent';
import { Tool } from './index';

export class FileReadTool implements Tool {
    definition: ToolDefinition = {
        name: 'read_file',
        description: 'Read the contents of a file from the workspace. Returns the file content as text.',
        parameters: {
            path: {
                type: 'string',
                description: 'Path to the file (relative to workspace root or absolute)',
                required: true,
            },
            startLine: {
                type: 'number',
                description: 'Starting line number (1-indexed, optional)',
                required: false,
            },
            endLine: {
                type: 'number',
                description: 'Ending line number (1-indexed, optional)',
                required: false,
            },
        },
        requiresConfirmation: false,
    };

    async execute(params: Record<string, unknown>): Promise<string> {
        const filePath = params.path as string;
        const startLine = params.startLine as number | undefined;
        const endLine = params.endLine as number | undefined;

        if (!filePath) {
            throw new Error('File path is required');
        }

        // Resolve path relative to workspace
        const absolutePath = this.resolvePath(filePath);

        // Security check
        if (!this.isPathSafe(absolutePath)) {
            throw new Error('Access to this path is not allowed');
        }

        // Check file exists
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        // Check file size
        const stats = fs.statSync(absolutePath);
        if (stats.size > DEFAULT_SECURITY_CONFIG.maxFileSize) {
            throw new Error(`File too large (${stats.size} bytes). Maximum: ${DEFAULT_SECURITY_CONFIG.maxFileSize} bytes`);
        }

        // Read file
        const content = fs.readFileSync(absolutePath, 'utf-8');

        // Handle line range if specified
        if (startLine !== undefined || endLine !== undefined) {
            const lines = content.split('\n');
            const start = Math.max(0, (startLine || 1) - 1);
            const end = endLine ? Math.min(lines.length, endLine) : lines.length;

            const selectedLines = lines.slice(start, end);
            const lineNumbers = selectedLines.map((line, i) => `${start + i + 1}: ${line}`);
            return lineNumbers.join('\n');
        }

        return content;
    }

    private resolvePath(filePath: string): string {
        if (path.isAbsolute(filePath)) {
            return filePath;
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            return path.join(workspaceFolders[0].uri.fsPath, filePath);
        }

        return path.resolve(filePath);
    }

    private isPathSafe(absolutePath: string): boolean {
        // Prevent directory traversal outside workspace
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            const normalizedPath = path.normalize(absolutePath);

            // Allow reading within workspace
            if (normalizedPath.startsWith(workspaceRoot)) {
                return true;
            }

            // Also allow reading from home directory with caution
            const homeDir = process.env.HOME || process.env.USERPROFILE || '';
            if (normalizedPath.startsWith(homeDir)) {
                // Block sensitive files
                const sensitivePatterns = [
                    '.ssh',
                    '.gnupg',
                    '.aws',
                    '.config/gcloud',
                    '.kube',
                    '.docker/config.json',
                ];

                for (const pattern of sensitivePatterns) {
                    if (normalizedPath.includes(pattern)) {
                        return false;
                    }
                }
                return true;
            }
        }

        // For safety, allow common development paths
        const safePrefixes = ['/tmp', '/var/tmp'];
        return safePrefixes.some(prefix => absolutePath.startsWith(prefix));
    }
}
