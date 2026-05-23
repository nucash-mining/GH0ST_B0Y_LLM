/**
 * GH0ST_B0Y Chat Panel
 * Webview panel for the agent chat interface
 * In Memory of GHOST - April 7, 2025
 */

import * as vscode from 'vscode';
import { AgentController, AgentCallbacks } from '../agent/AgentController';
import { WebviewMessage, ChatPanelMessage, ToolResult, PendingConfirmation } from '../types/agent';

export class ChatPanel {
    public static currentPanel: ChatPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private readonly extensionContext: vscode.ExtensionContext;
    private agent: AgentController;
    private disposables: vscode.Disposable[] = [];

    private constructor(
        panel: vscode.WebviewPanel,
        context: vscode.ExtensionContext
    ) {
        this.panel = panel;
        this.extensionContext = context;

        // Create agent with callbacks
        const callbacks: AgentCallbacks = {
            onToken: (token) => this.sendMessage({ type: 'streamToken', content: token }),
            onToolExecution: (toolName, params) => this.sendMessage({
                type: 'toolExecution',
                content: `Executing: ${toolName}`,
                toolCall: { tool: toolName, params, id: '' }
            }),
            onToolResult: (result) => this.sendMessage({
                type: 'toolExecution',
                toolResult: result,
                content: result.success ? result.output : result.error
            }),
            onConfirmationNeeded: (pending) => this.sendMessage({
                type: 'confirmTool',
                content: pending.preview,
                toolCall: pending.toolCall
            }),
            onError: (error) => this.sendMessage({ type: 'error', content: error }),
            onComplete: () => this.sendMessage({ type: 'assistantMessage', content: '' }),
            onStateChange: () => { /* Could update UI state indicators */ },
        };

        this.agent = new AgentController(context, callbacks);

        // Set up the webview
        this.panel.webview.html = this.getHtmlContent();

        // Handle messages from webview
        this.panel.webview.onDidReceiveMessage(
            (message: WebviewMessage) => this.handleWebviewMessage(message),
            null,
            this.disposables
        );

        // Clean up on dispose
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        // Initialize agent
        this.initializeAgent();
    }

    /**
     * Create or show the chat panel
     */
    public static createOrShow(context: vscode.ExtensionContext): ChatPanel {
        const column = vscode.ViewColumn.Beside;

        if (ChatPanel.currentPanel) {
            ChatPanel.currentPanel.panel.reveal(column);
            return ChatPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            'ghostBoyChat',
            '🐕 GH0ST_B0Y Chat',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [],
            }
        );

        ChatPanel.currentPanel = new ChatPanel(panel, context);
        return ChatPanel.currentPanel;
    }

    private async initializeAgent(): Promise<void> {
        const success = await this.agent.initialize();

        if (success) {
            // Load and display existing messages
            const messages = this.agent.getMessages();
            for (const msg of messages) {
                if (msg.role === 'user') {
                    this.sendMessage({ type: 'userMessage', content: msg.content });
                } else if (msg.role === 'assistant') {
                    this.sendMessage({ type: 'assistantMessage', content: msg.content });
                }
            }

            // Get available models
            const models = await this.agent.getAvailableModels();
            const currentModel = this.agent.getCurrentModel();
            this.panel.webview.postMessage({
                type: 'modelsLoaded',
                models,
                currentModel
            });
        } else {
            this.sendMessage({
                type: 'error',
                content: 'Failed to connect to Ollama. Make sure it is running with: ollama serve'
            });
        }
    }

    private async handleWebviewMessage(message: WebviewMessage): Promise<void> {
        switch (message.command) {
            case 'sendMessage':
                if (message.text) {
                    this.sendMessage({ type: 'userMessage', content: message.text });
                    await this.agent.processMessage(message.text);
                }
                break;

            case 'confirmTool':
                await this.agent.confirmTool();
                this.sendMessage({ type: 'confirmResult', confirmed: true });
                break;

            case 'rejectTool':
                this.agent.rejectTool();
                this.sendMessage({ type: 'confirmResult', confirmed: false });
                break;

            case 'clearHistory':
                await this.agent.clearHistory();
                this.sendMessage({ type: 'clear' });
                break;

            case 'selectModel':
                if (message.model) {
                    this.agent.setModel(message.model);
                }
                break;
        }
    }

    private sendMessage(message: ChatPanelMessage): void {
        this.panel.webview.postMessage(message);
    }

    private dispose(): void {
        ChatPanel.currentPanel = undefined;

        this.panel.dispose();

        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    private getHtmlContent(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GH0ST_B0Y Chat</title>
    <style>
        :root {
            --bg-primary: #0a0a0f;
            --bg-secondary: #12121a;
            --bg-tertiary: #1a1a25;
            --text-primary: #e0e0e0;
            --text-secondary: #888;
            --accent-cyan: #00ffff;
            --accent-cyan-dim: #00aaaa;
            --accent-red: #ff4444;
            --accent-green: #00ff64;
            --accent-yellow: #ffcc00;
            --border-color: rgba(0, 255, 255, 0.2);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background: var(--bg-primary);
            color: var(--text-primary);
            font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
            font-size: 13px;
            line-height: 1.5;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }

        /* Header */
        .header {
            background: var(--bg-secondary);
            border-bottom: 1px solid var(--border-color);
            padding: 10px 15px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .header-title {
            color: var(--accent-cyan);
            font-size: 14px;
            font-weight: bold;
            text-shadow: 0 0 10px var(--accent-cyan);
        }

        .header-controls {
            display: flex;
            gap: 10px;
            align-items: center;
        }

        select {
            background: var(--bg-tertiary);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 5px 10px;
            font-family: inherit;
            font-size: 12px;
            cursor: pointer;
        }

        .btn {
            background: transparent;
            color: var(--text-secondary);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 5px 10px;
            font-family: inherit;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .btn:hover {
            color: var(--accent-cyan);
            border-color: var(--accent-cyan);
        }

        /* Messages Area */
        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 15px;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .message {
            max-width: 90%;
            padding: 12px 15px;
            border-radius: 8px;
            position: relative;
        }

        .message-user {
            background: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            align-self: flex-end;
        }

        .message-assistant {
            background: var(--bg-secondary);
            border-left: 3px solid var(--accent-cyan);
            align-self: flex-start;
        }

        .message-tool {
            background: rgba(0, 255, 255, 0.05);
            border: 1px dashed var(--accent-cyan-dim);
            font-size: 12px;
            align-self: flex-start;
        }

        .message-error {
            background: rgba(255, 68, 68, 0.1);
            border: 1px solid var(--accent-red);
            color: var(--accent-red);
            align-self: center;
        }

        .message-label {
            font-size: 10px;
            text-transform: uppercase;
            color: var(--text-secondary);
            margin-bottom: 5px;
        }

        .message-content {
            white-space: pre-wrap;
            word-break: break-word;
        }

        .message-content code {
            background: rgba(0, 255, 255, 0.1);
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 12px;
        }

        .message-content pre {
            background: var(--bg-primary);
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
            margin: 10px 0;
        }

        /* Confirmation Dialog */
        .confirm-dialog {
            background: var(--bg-secondary);
            border: 2px solid var(--accent-yellow);
            border-radius: 8px;
            padding: 15px;
            align-self: stretch;
        }

        .confirm-title {
            color: var(--accent-yellow);
            font-weight: bold;
            margin-bottom: 10px;
        }

        .confirm-preview {
            background: var(--bg-primary);
            padding: 10px;
            border-radius: 4px;
            font-size: 12px;
            max-height: 200px;
            overflow-y: auto;
            margin-bottom: 15px;
            white-space: pre-wrap;
        }

        .confirm-buttons {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }

        .btn-confirm {
            background: var(--accent-green);
            color: #000;
            border: none;
            padding: 8px 16px;
            font-weight: bold;
        }

        .btn-confirm:hover {
            background: #00dd55;
        }

        .btn-reject {
            background: var(--accent-red);
            color: #fff;
            border: none;
            padding: 8px 16px;
        }

        .btn-reject:hover {
            background: #dd3333;
        }

        /* Input Area */
        .input-area {
            background: var(--bg-secondary);
            border-top: 1px solid var(--border-color);
            padding: 15px;
        }

        .input-container {
            display: flex;
            gap: 10px;
        }

        .input-field {
            flex: 1;
            background: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 10px 15px;
            color: var(--text-primary);
            font-family: inherit;
            font-size: 13px;
            resize: none;
            min-height: 20px;
            max-height: 150px;
        }

        .input-field:focus {
            outline: none;
            border-color: var(--accent-cyan);
            box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
        }

        .send-btn {
            background: linear-gradient(135deg, var(--accent-cyan), #0088ff);
            color: #000;
            border: none;
            border-radius: 4px;
            padding: 10px 20px;
            font-family: inherit;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s;
        }

        .send-btn:hover {
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.4);
        }

        .send-btn:disabled {
            background: var(--bg-tertiary);
            color: var(--text-secondary);
            cursor: not-allowed;
        }

        /* Loading Indicator */
        .loading {
            display: flex;
            gap: 5px;
            padding: 10px;
        }

        .loading-dot {
            width: 8px;
            height: 8px;
            background: var(--accent-cyan);
            border-radius: 50%;
            animation: pulse 1.4s ease-in-out infinite;
        }

        .loading-dot:nth-child(2) { animation-delay: 0.2s; }
        .loading-dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes pulse {
            0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
            40% { transform: scale(1); opacity: 1; }
        }

        /* Scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
        }

        ::-webkit-scrollbar-track {
            background: var(--bg-primary);
        }

        ::-webkit-scrollbar-thumb {
            background: var(--border-color);
            border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: var(--accent-cyan-dim);
        }

        /* Welcome Message */
        .welcome {
            text-align: center;
            padding: 40px;
            color: var(--text-secondary);
        }

        .welcome-title {
            color: var(--accent-cyan);
            font-size: 18px;
            margin-bottom: 10px;
            text-shadow: 0 0 20px var(--accent-cyan);
        }

        .welcome-ghost {
            font-size: 48px;
            margin-bottom: 15px;
        }
    </style>
</head>
<body>
    <div class="header">
        <span class="header-title">🐕 GH0ST_B0Y ORACLE</span>
        <div class="header-controls">
            <select id="modelSelect">
                <option value="">Loading models...</option>
            </select>
            <button class="btn" id="clearBtn">Clear</button>
        </div>
    </div>

    <div class="messages" id="messages">
        <div class="welcome">
            <div class="welcome-ghost">👻</div>
            <div class="welcome-title">Welcome to GH0ST_B0Y</div>
            <p>Your decentralized AI coding oracle.</p>
            <p>Ask me to read files, search code, run commands, or write code.</p>
        </div>
    </div>

    <div class="input-area">
        <div class="input-container">
            <textarea
                class="input-field"
                id="input"
                placeholder="Ask GH0ST_B0Y anything..."
                rows="1"
            ></textarea>
            <button class="send-btn" id="sendBtn">Send</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const messagesEl = document.getElementById('messages');
        const inputEl = document.getElementById('input');
        const sendBtn = document.getElementById('sendBtn');
        const clearBtn = document.getElementById('clearBtn');
        const modelSelect = document.getElementById('modelSelect');

        let isProcessing = false;
        let currentAssistantMessage = null;
        let welcomeShown = true;

        // Auto-resize textarea
        inputEl.addEventListener('input', () => {
            inputEl.style.height = 'auto';
            inputEl.style.height = Math.min(inputEl.scrollHeight, 150) + 'px';
        });

        // Send message on Enter (Shift+Enter for newline)
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        sendBtn.addEventListener('click', sendMessage);
        clearBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'clearHistory' });
        });

        modelSelect.addEventListener('change', () => {
            vscode.postMessage({ command: 'selectModel', model: modelSelect.value });
        });

        function sendMessage() {
            const text = inputEl.value.trim();
            if (!text || isProcessing) return;

            vscode.postMessage({ command: 'sendMessage', text });
            inputEl.value = '';
            inputEl.style.height = 'auto';
            setProcessing(true);
        }

        function setProcessing(processing) {
            isProcessing = processing;
            sendBtn.disabled = processing;
            inputEl.disabled = processing;
        }

        function hideWelcome() {
            if (welcomeShown) {
                const welcome = messagesEl.querySelector('.welcome');
                if (welcome) welcome.remove();
                welcomeShown = false;
            }
        }

        function addMessage(type, content) {
            hideWelcome();

            const div = document.createElement('div');
            div.className = 'message message-' + type;

            const label = document.createElement('div');
            label.className = 'message-label';
            label.textContent = type === 'user' ? 'You' : type === 'assistant' ? 'GH0ST_B0Y' : type;

            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.textContent = content;

            div.appendChild(label);
            div.appendChild(contentDiv);
            messagesEl.appendChild(div);
            messagesEl.scrollTop = messagesEl.scrollHeight;

            return contentDiv;
        }

        function addLoading() {
            hideWelcome();

            const div = document.createElement('div');
            div.className = 'message message-assistant';
            div.id = 'loading';

            const label = document.createElement('div');
            label.className = 'message-label';
            label.textContent = 'GH0ST_B0Y';

            const loading = document.createElement('div');
            loading.className = 'loading';
            loading.innerHTML = '<div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div>';

            div.appendChild(label);
            div.appendChild(loading);
            messagesEl.appendChild(div);
            messagesEl.scrollTop = messagesEl.scrollHeight;

            return div;
        }

        function addConfirmDialog(preview, toolCall) {
            hideWelcome();

            const div = document.createElement('div');
            div.className = 'confirm-dialog';
            div.id = 'confirm-dialog';

            div.innerHTML = \`
                <div class="confirm-title">⚠️ Confirm Action: \${toolCall.tool}</div>
                <pre class="confirm-preview">\${escapeHtml(preview)}</pre>
                <div class="confirm-buttons">
                    <button class="btn btn-reject" onclick="rejectTool()">Reject</button>
                    <button class="btn btn-confirm" onclick="confirmTool()">Confirm</button>
                </div>
            \`;

            messagesEl.appendChild(div);
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        window.confirmTool = function() {
            vscode.postMessage({ command: 'confirmTool' });
            const dialog = document.getElementById('confirm-dialog');
            if (dialog) dialog.remove();
        };

        window.rejectTool = function() {
            vscode.postMessage({ command: 'rejectTool' });
            const dialog = document.getElementById('confirm-dialog');
            if (dialog) dialog.remove();
        };

        // Handle messages from extension
        window.addEventListener('message', (event) => {
            const message = event.data;

            switch (message.type) {
                case 'userMessage':
                    addMessage('user', message.content);
                    break;

                case 'assistantMessage':
                    // Remove loading indicator
                    const loading = document.getElementById('loading');
                    if (loading) loading.remove();

                    if (currentAssistantMessage) {
                        // Message complete
                        currentAssistantMessage = null;
                    }
                    setProcessing(false);
                    break;

                case 'streamToken':
                    // Remove loading indicator
                    const loadingEl = document.getElementById('loading');
                    if (loadingEl) loadingEl.remove();

                    if (!currentAssistantMessage) {
                        currentAssistantMessage = addMessage('assistant', '');
                    }
                    currentAssistantMessage.textContent += message.content;
                    messagesEl.scrollTop = messagesEl.scrollHeight;
                    break;

                case 'toolExecution':
                    addMessage('tool', message.content || \`Tool: \${message.toolCall?.tool}\`);
                    break;

                case 'confirmTool':
                    addConfirmDialog(message.content, message.toolCall);
                    break;

                case 'confirmResult':
                    // Dialog already removed by button handlers
                    break;

                case 'error':
                    addMessage('error', message.content);
                    setProcessing(false);
                    currentAssistantMessage = null;
                    break;

                case 'clear':
                    messagesEl.innerHTML = \`
                        <div class="welcome">
                            <div class="welcome-ghost">👻</div>
                            <div class="welcome-title">Welcome to GH0ST_B0Y</div>
                            <p>Your decentralized AI coding oracle.</p>
                            <p>Ask me to read files, search code, run commands, or write code.</p>
                        </div>
                    \`;
                    welcomeShown = true;
                    break;

                case 'modelsLoaded':
                    modelSelect.innerHTML = message.models.map(m =>
                        \`<option value="\${m}" \${m === message.currentModel ? 'selected' : ''}>\${m}</option>\`
                    ).join('');
                    break;
            }
        });

        // Start with loading indicator when first message is sent
        inputEl.focus();
    </script>
</body>
</html>`;
    }
}
