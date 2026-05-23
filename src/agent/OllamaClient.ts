/**
 * GH0ST_B0Y Ollama Client
 * HTTP client with streaming support for local Ollama inference
 * In Memory of GHOST - April 7, 2025
 */

import * as vscode from 'vscode';
import * as http from 'http';
import {
    OllamaConfig,
    OllamaGenerateRequest,
    OllamaGenerateResponse,
    OllamaTagsResponse,
    OllamaModel,
} from '../types/agent';

export class OllamaClient {
    private config: OllamaConfig;

    constructor(config?: Partial<OllamaConfig>) {
        const vsConfig = vscode.workspace.getConfiguration('ghostBoyOracle');
        this.config = {
            baseUrl: config?.baseUrl || vsConfig.get<string>('ollamaUrl') || 'http://localhost:11434',
            model: config?.model || vsConfig.get<string>('ollamaModel') || 'llama3.2',
            timeout: config?.timeout || 120000,
        };
    }

    /**
     * Get current configuration
     */
    getConfig(): OllamaConfig {
        return { ...this.config };
    }

    /**
     * Update model
     */
    setModel(model: string): void {
        this.config.model = model;
    }

    /**
     * Check if Ollama server is running
     */
    async isRunning(): Promise<boolean> {
        try {
            const response = await this.httpGet('/api/tags');
            return response.statusCode === 200;
        } catch {
            return false;
        }
    }

    /**
     * List available models
     */
    async listModels(): Promise<OllamaModel[]> {
        try {
            const response = await this.httpGet('/api/tags');
            if (response.statusCode === 200 && response.body) {
                const data = JSON.parse(response.body) as OllamaTagsResponse;
                return data.models || [];
            }
            return [];
        } catch (error) {
            console.error('Failed to list models:', error);
            return [];
        }
    }

    /**
     * Generate completion with streaming
     */
    async *generateStream(
        prompt: string,
        systemPrompt?: string,
        context?: number[]
    ): AsyncGenerator<OllamaGenerateResponse> {
        const request: OllamaGenerateRequest = {
            model: this.config.model,
            prompt,
            system: systemPrompt,
            stream: true,
            context,
        };

        const url = new URL(this.config.baseUrl);
        const options: http.RequestOptions = {
            hostname: url.hostname,
            port: url.port || 11434,
            path: '/api/generate',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: this.config.timeout,
        };

        const body = JSON.stringify(request);

        yield* await new Promise<AsyncGenerator<OllamaGenerateResponse>>((resolve, reject) => {
            const req = http.request(options, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                    return;
                }

                const generator = (async function* () {
                    let buffer = '';

                    for await (const chunk of res) {
                        buffer += chunk.toString();
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            if (line.trim()) {
                                try {
                                    const parsed = JSON.parse(line) as OllamaGenerateResponse;
                                    yield parsed;
                                    if (parsed.done) {
                                        return;
                                    }
                                } catch (e) {
                                    console.error('Failed to parse streaming response:', e);
                                }
                            }
                        }
                    }

                    // Process any remaining buffer
                    if (buffer.trim()) {
                        try {
                            const parsed = JSON.parse(buffer) as OllamaGenerateResponse;
                            yield parsed;
                        } catch (e) {
                            console.error('Failed to parse final buffer:', e);
                        }
                    }
                })();

                resolve(generator);
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timed out'));
            });

            req.write(body);
            req.end();
        });
    }

    /**
     * Generate completion (non-streaming, returns full response)
     */
    async generate(
        prompt: string,
        systemPrompt?: string,
        context?: number[]
    ): Promise<{ response: string; context?: number[] }> {
        let fullResponse = '';
        let finalContext: number[] | undefined;

        for await (const chunk of this.generateStream(prompt, systemPrompt, context)) {
            fullResponse += chunk.response;
            if (chunk.done && chunk.context) {
                finalContext = chunk.context;
            }
        }

        return { response: fullResponse, context: finalContext };
    }

    /**
     * Generate with callback for each token (for UI updates)
     */
    async generateWithCallback(
        prompt: string,
        systemPrompt: string | undefined,
        onToken: (token: string) => void,
        context?: number[]
    ): Promise<{ response: string; context?: number[] }> {
        let fullResponse = '';
        let finalContext: number[] | undefined;

        for await (const chunk of this.generateStream(prompt, systemPrompt, context)) {
            fullResponse += chunk.response;
            onToken(chunk.response);
            if (chunk.done && chunk.context) {
                finalContext = chunk.context;
            }
        }

        return { response: fullResponse, context: finalContext };
    }

    /**
     * Simple HTTP GET request
     */
    private httpGet(path: string): Promise<{ statusCode: number; body: string }> {
        return new Promise((resolve, reject) => {
            const url = new URL(this.config.baseUrl);
            const options: http.RequestOptions = {
                hostname: url.hostname,
                port: url.port || 11434,
                path,
                method: 'GET',
                timeout: 5000,
            };

            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => { body += chunk; });
                res.on('end', () => {
                    resolve({ statusCode: res.statusCode || 0, body });
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timed out'));
            });

            req.end();
        });
    }
}

/**
 * Check Ollama status and show notification
 */
export async function checkOllamaStatus(): Promise<void> {
    const client = new OllamaClient();
    const isRunning = await client.isRunning();

    if (isRunning) {
        const models = await client.listModels();
        const modelNames = models.map(m => m.name).join(', ');
        vscode.window.showInformationMessage(
            `🐕 Ollama is running! Models: ${modelNames || 'none'}`
        );
    } else {
        const action = await vscode.window.showErrorMessage(
            '🐕 Ollama is not running. Start it with: ollama serve',
            'Copy Command'
        );
        if (action === 'Copy Command') {
            await vscode.env.clipboard.writeText('ollama serve');
            vscode.window.showInformationMessage('Command copied to clipboard');
        }
    }
}
