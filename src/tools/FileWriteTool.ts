/**
 * GH0ST_B0Y File Write Tool
 * Write/edit file contents in workspace (requires confirmation)
 * In Memory of GHOST - April 7, 2025
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ToolDefinition, DEFAULT_SECURITY_CONFIG } from '../types/agent';
import { Tool } from './index';

export class FileWriteTool implements Tool {
    definition: ToolDefinition = {
        name: 'write_file',
        description: 'Write or overwrite content to a file. Creates parent directories if needed. REQUIRES USER CONFIRMATION before execution.',
        parameters: {
            path: {
                type: 'string',
                description: 'Path to the file (relative to workspace root or absolute)',
                required: true,
            },
            content: {
                type: 'string',
                description: 'Content to write to the file',
                required: true,
            },
            createDirectories: {
                type: 'boolean',
                description: 'Create parent directories if they do not exist',
                required: false,
                default: true,
            },
        },
        requiresConfirmation: true,
    };

    async execute(params: Record<string, unknown>): Promise<string> {
        const filePath = params.path as string;
        const content = params.content as string;
        const createDirectories = params.createDirectories !== false;

        if (!filePath) {
            throw new Error('File path is required');
        }

        if (content === undefined || content === null) {
            throw new Error('Content is required');
        }

        const absolutePath = this.resolvePath(filePath);

        // Security checks
        if (!this.isPathSafe(absolutePath)) {
            throw new Error('Writing to this path is not allowed');
        }

        if (!this.isExtensionAllowed(absolutePath)) {
            throw new Error(`File extension not allowed. Allowed: ${DEFAULT_SECURITY_CONFIG.allowedExtensions.join(', ')}`);
        }

        // Create directories if needed
        const dir = path.dirname(absolutePath);
        if (createDirectories && !fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Check if file exists for diff
        const existed = fs.existsSync(absolutePath);
        const oldContent = existed ? fs.readFileSync(absolutePath, 'utf-8') : null;

        // Write file
        fs.writeFileSync(absolutePath, content, 'utf-8');

        // Return summary
        const relativePath = this.getRelativePath(absolutePath);
        if (existed) {
            const oldLines = oldContent?.split('\n').length || 0;
            const newLines = content.split('\n').length;
            return `Updated ${relativePath}\n  Lines: ${oldLines} -> ${newLines}`;
        } else {
            const lines = content.split('\n').length;
            return `Created ${relativePath}\n  Lines: ${lines}`;
        }
    }

    /**
     * Generate a preview diff for confirmation UI
     */
    async getPreview(params: Record<string, unknown>): Promise<string> {
        const filePath = params.path as string;
        const content = params.content as string;

        const absolutePath = this.resolvePath(filePath);
        const relativePath = this.getRelativePath(absolutePath);

        // Check if file exists
        const existed = fs.existsSync(absolutePath);

        if (!existed) {
            // New file preview
            const lines = content.split('\n');
            const preview = lines.slice(0, 20).map((line, i) => `+ ${line}`).join('\n');
            const suffix = lines.length > 20 ? `\n... and ${lines.length - 20} more lines` : '';
            return `CREATE: ${relativePath}\n\n${preview}${suffix}`;
        }

        // Existing file - show diff
        const oldContent = fs.readFileSync(absolutePath, 'utf-8');
        const diff = this.generateDiff(oldContent, content);

        return `MODIFY: ${relativePath}\n\n${diff}`;
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

    private getRelativePath(absolutePath: string): string {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const relative = path.relative(workspaceFolders[0].uri.fsPath, absolutePath);
            if (!relative.startsWith('..')) {
                return relative;
            }
        }
        return absolutePath;
    }

    private isPathSafe(absolutePath: string): boolean {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            const normalizedPath = path.normalize(absolutePath);

            // Only allow writing within workspace
            if (normalizedPath.startsWith(workspaceRoot)) {
                // Block writing to certain directories
                const blockedPaths = ['.git', 'node_modules'];
                for (const blocked of blockedPaths) {
                    if (normalizedPath.includes(path.sep + blocked + path.sep) ||
                        normalizedPath.endsWith(path.sep + blocked)) {
                        return false;
                    }
                }
                return true;
            }
        }
        return false;
    }

    private isExtensionAllowed(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase();
        const filename = path.basename(filePath);

        // Allow files without extension if they're known config files
        const knownConfigFiles = ['Makefile', 'Dockerfile', 'Vagrantfile', '.gitignore', '.dockerignore'];
        if (!ext && knownConfigFiles.includes(filename)) {
            return true;
        }

        // Check allowed extensions
        return DEFAULT_SECURITY_CONFIG.allowedExtensions.includes(ext);
    }

    private generateDiff(oldContent: string, newContent: string): string {
        const oldLines = oldContent.split('\n');
        const newLines = newContent.split('\n');

        const diff: string[] = [];
        const maxLines = 50;
        let diffCount = 0;

        // Simple line-by-line diff
        const maxLen = Math.max(oldLines.length, newLines.length);

        for (let i = 0; i < maxLen && diffCount < maxLines; i++) {
            const oldLine = oldLines[i];
            const newLine = newLines[i];

            if (oldLine === undefined && newLine !== undefined) {
                diff.push(`+ ${newLine}`);
                diffCount++;
            } else if (oldLine !== undefined && newLine === undefined) {
                diff.push(`- ${oldLine}`);
                diffCount++;
            } else if (oldLine !== newLine) {
                diff.push(`- ${oldLine}`);
                diff.push(`+ ${newLine}`);
                diffCount += 2;
            } else if (diffCount > 0 && diffCount < 10) {
                // Show some context
                diff.push(`  ${oldLine}`);
            }
        }

        if (diffCount >= maxLines) {
            diff.push(`\n... diff truncated (${maxLen} total lines)`);
        }

        if (diff.length === 0) {
            return '(no changes)';
        }

        return diff.join('\n');
    }
}
