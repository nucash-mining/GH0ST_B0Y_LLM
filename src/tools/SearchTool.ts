/**
 * GH0ST_B0Y Search Tool
 * Search for text patterns in workspace files
 * In Memory of GHOST - April 7, 2025
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ToolDefinition } from '../types/agent';
import { Tool } from './index';

interface SearchMatch {
    file: string;
    line: number;
    content: string;
}

export class SearchTool implements Tool {
    definition: ToolDefinition = {
        name: 'search_workspace',
        description: 'Search for a text pattern or regex in workspace files. Returns matching lines with file paths and line numbers.',
        parameters: {
            pattern: {
                type: 'string',
                description: 'Text or regex pattern to search for',
                required: true,
            },
            filePattern: {
                type: 'string',
                description: 'Glob pattern to filter files (e.g., "*.ts", "**/*.py")',
                required: false,
                default: '**/*',
            },
            caseSensitive: {
                type: 'boolean',
                description: 'Whether the search is case-sensitive',
                required: false,
                default: false,
            },
            maxResults: {
                type: 'number',
                description: 'Maximum number of results to return',
                required: false,
                default: 50,
            },
        },
        requiresConfirmation: false,
    };

    async execute(params: Record<string, unknown>): Promise<string> {
        const pattern = params.pattern as string;
        const filePattern = (params.filePattern as string) || '**/*';
        const caseSensitive = params.caseSensitive as boolean || false;
        const maxResults = (params.maxResults as number) || 50;

        if (!pattern) {
            throw new Error('Search pattern is required');
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new Error('No workspace folder open');
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;

        // Build regex
        let regex: RegExp;
        try {
            const flags = caseSensitive ? 'g' : 'gi';
            regex = new RegExp(pattern, flags);
        } catch (error) {
            // If not valid regex, escape and treat as literal
            const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const flags = caseSensitive ? 'g' : 'gi';
            regex = new RegExp(escaped, flags);
        }

        const matches: SearchMatch[] = [];
        const skipDirs = ['node_modules', '.git', '__pycache__', 'dist', 'build', '.venv', 'venv', 'out'];

        // Find files matching the file pattern
        const files = await this.findFiles(workspaceRoot, filePattern, skipDirs);

        // Search each file
        for (const file of files) {
            if (matches.length >= maxResults) break;

            const fileMatches = await this.searchFile(file, regex, workspaceRoot);
            for (const match of fileMatches) {
                if (matches.length >= maxResults) break;
                matches.push(match);
            }
        }

        if (matches.length === 0) {
            return `No matches found for pattern: ${pattern}`;
        }

        // Format results
        let result = `Found ${matches.length} matches for "${pattern}":\n\n`;

        let currentFile = '';
        for (const match of matches) {
            if (match.file !== currentFile) {
                currentFile = match.file;
                result += `\n${match.file}:\n`;
            }
            result += `  ${match.line}: ${match.content.trim()}\n`;
        }

        if (matches.length === maxResults) {
            result += `\n[Results limited to ${maxResults} matches]`;
        }

        return result;
    }

    private async findFiles(
        rootDir: string,
        filePattern: string,
        skipDirs: string[]
    ): Promise<string[]> {
        const files: string[] = [];
        const maxFiles = 1000;

        // Convert glob pattern to simple matching
        const isMatch = this.createMatcher(filePattern);

        const walk = (dir: string, depth: number = 0): void => {
            if (files.length >= maxFiles || depth > 10) return;

            let entries: fs.Dirent[];
            try {
                entries = fs.readdirSync(dir, { withFileTypes: true });
            } catch {
                return;
            }

            for (const entry of entries) {
                if (files.length >= maxFiles) return;

                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    if (!skipDirs.includes(entry.name) && !entry.name.startsWith('.')) {
                        walk(fullPath, depth + 1);
                    }
                } else if (entry.isFile()) {
                    const relativePath = path.relative(rootDir, fullPath);
                    if (isMatch(relativePath) && this.isTextFile(entry.name)) {
                        files.push(fullPath);
                    }
                }
            }
        };

        walk(rootDir);
        return files;
    }

    private createMatcher(pattern: string): (path: string) => boolean {
        // Handle common glob patterns
        if (pattern === '**/*' || pattern === '*') {
            return () => true;
        }

        // Convert glob to regex
        let regexStr = pattern
            .replace(/\./g, '\\.')
            .replace(/\*\*/g, '<<<DOUBLESTAR>>>')
            .replace(/\*/g, '[^/]*')
            .replace(/<<<DOUBLESTAR>>>/g, '.*')
            .replace(/\?/g, '.');

        // Handle extensions like "*.ts"
        if (pattern.startsWith('*.')) {
            regexStr = '.*' + regexStr.slice(1);
        }

        const regex = new RegExp(`^${regexStr}$`, 'i');
        return (path: string) => regex.test(path);
    }

    private isTextFile(filename: string): boolean {
        const textExtensions = [
            '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt',
            '.py', '.rs', '.go', '.sol', '.toml', '.yaml', '.yml',
            '.html', '.css', '.scss', '.less', '.sh', '.bash',
            '.env', '.gitignore', '.dockerignore', '.xml', '.svg',
            '.c', '.cpp', '.h', '.hpp', '.java', '.kt', '.swift',
            '.rb', '.php', '.pl', '.lua', '.vim', '.sql',
        ];

        const ext = path.extname(filename).toLowerCase();
        return textExtensions.includes(ext) || !ext;
    }

    private async searchFile(
        filePath: string,
        regex: RegExp,
        workspaceRoot: string
    ): Promise<SearchMatch[]> {
        const matches: SearchMatch[] = [];

        try {
            const stats = fs.statSync(filePath);
            // Skip files larger than 1MB
            if (stats.size > 1024 * 1024) {
                return matches;
            }

            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');
            const relativePath = path.relative(workspaceRoot, filePath);

            for (let i = 0; i < lines.length; i++) {
                // Reset regex lastIndex for global regex
                regex.lastIndex = 0;
                if (regex.test(lines[i])) {
                    matches.push({
                        file: relativePath,
                        line: i + 1,
                        content: lines[i].slice(0, 200), // Limit line length
                    });
                }
            }
        } catch {
            // Skip files that can't be read
        }

        return matches;
    }
}
