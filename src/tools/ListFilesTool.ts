/**
 * GH0ST_B0Y List Files Tool
 * List directory contents in workspace
 * In Memory of GHOST - April 7, 2025
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ToolDefinition } from '../types/agent';
import { Tool } from './index';

export class ListFilesTool implements Tool {
    definition: ToolDefinition = {
        name: 'list_files',
        description: 'List files and directories in a given path. Returns a tree-like structure of the directory contents.',
        parameters: {
            path: {
                type: 'string',
                description: 'Path to directory (relative to workspace root or absolute). Defaults to workspace root.',
                required: false,
                default: '.',
            },
            recursive: {
                type: 'boolean',
                description: 'Whether to list recursively (default: false, max depth 3)',
                required: false,
                default: false,
            },
            showHidden: {
                type: 'boolean',
                description: 'Whether to show hidden files (starting with .)',
                required: false,
                default: false,
            },
        },
        requiresConfirmation: false,
    };

    async execute(params: Record<string, unknown>): Promise<string> {
        const dirPath = (params.path as string) || '.';
        const recursive = params.recursive as boolean || false;
        const showHidden = params.showHidden as boolean || false;

        const absolutePath = this.resolvePath(dirPath);

        if (!fs.existsSync(absolutePath)) {
            throw new Error(`Directory not found: ${dirPath}`);
        }

        const stats = fs.statSync(absolutePath);
        if (!stats.isDirectory()) {
            throw new Error(`Not a directory: ${dirPath}`);
        }

        const maxDepth = recursive ? 3 : 1;
        const tree = this.buildTree(absolutePath, '', maxDepth, showHidden);

        return `Contents of ${dirPath}:\n${tree}`;
    }

    private resolvePath(dirPath: string): string {
        if (path.isAbsolute(dirPath)) {
            return dirPath;
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            return path.join(workspaceFolders[0].uri.fsPath, dirPath);
        }

        return path.resolve(dirPath);
    }

    private buildTree(
        dirPath: string,
        prefix: string,
        maxDepth: number,
        showHidden: boolean,
        currentDepth: number = 0
    ): string {
        if (currentDepth >= maxDepth) {
            return '';
        }

        let result = '';
        let entries: fs.Dirent[];

        try {
            entries = fs.readdirSync(dirPath, { withFileTypes: true });
        } catch (error) {
            return `${prefix}[Permission denied]\n`;
        }

        // Filter and sort entries
        entries = entries
            .filter(entry => showHidden || !entry.name.startsWith('.'))
            .sort((a, b) => {
                // Directories first, then alphabetically
                if (a.isDirectory() && !b.isDirectory()) return -1;
                if (!a.isDirectory() && b.isDirectory()) return 1;
                return a.name.localeCompare(b.name);
            });

        // Skip common large/uninteresting directories
        const skipDirs = ['node_modules', '.git', '__pycache__', 'dist', 'build', '.venv', 'venv'];

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const isLast = i === entries.length - 1;
            const connector = isLast ? '└── ' : '├── ';
            const childPrefix = isLast ? '    ' : '│   ';

            if (entry.isDirectory()) {
                const dirIndicator = skipDirs.includes(entry.name) ? ' [skipped]' : '/';
                result += `${prefix}${connector}${entry.name}${dirIndicator}\n`;

                if (!skipDirs.includes(entry.name) && currentDepth < maxDepth - 1) {
                    const childPath = path.join(dirPath, entry.name);
                    result += this.buildTree(
                        childPath,
                        prefix + childPrefix,
                        maxDepth,
                        showHidden,
                        currentDepth + 1
                    );
                }
            } else {
                const size = this.getFileSize(path.join(dirPath, entry.name));
                result += `${prefix}${connector}${entry.name} (${size})\n`;
            }
        }

        return result;
    }

    private getFileSize(filePath: string): string {
        try {
            const stats = fs.statSync(filePath);
            const bytes = stats.size;

            if (bytes < 1024) return `${bytes} B`;
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        } catch {
            return '? B';
        }
    }
}
