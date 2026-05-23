/**
 * ViRtUaL_B0Y Chat Panel
 * Nintendo Virtual Boy inspired chat interface
 * Red LED aesthetic with scanlines and 90s VR vibes
 * In Memory of GHOST - April 7, 2025
 */

import * as vscode from 'vscode';
import { AgentController, AgentCallbacks } from '../agent/AgentController';
import { WebviewMessage, ChatPanelMessage, PendingConfirmation } from '../types/agent';

export class VirtualBoyPanel {
    public static currentPanel: VirtualBoyPanel | undefined;
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
                content: `EXECUTING: ${toolName}`,
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
            onStateChange: () => {},
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
     * Create or show the Virtual Boy panel
     */
    public static createOrShow(context: vscode.ExtensionContext): VirtualBoyPanel {
        // Use a full editor column for the immersive experience
        const column = vscode.ViewColumn.One;

        if (VirtualBoyPanel.currentPanel) {
            VirtualBoyPanel.currentPanel.panel.reveal(column);
            return VirtualBoyPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            'virtualBoyChat',
            'ViRtUaL_B0Y',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [],
            }
        );

        VirtualBoyPanel.currentPanel = new VirtualBoyPanel(panel, context);
        return VirtualBoyPanel.currentPanel;
    }

    private async initializeAgent(): Promise<void> {
        const success = await this.agent.initialize();

        if (success) {
            const messages = this.agent.getMessages();
            for (const msg of messages) {
                if (msg.role === 'user') {
                    this.sendMessage({ type: 'userMessage', content: msg.content });
                } else if (msg.role === 'assistant') {
                    this.sendMessage({ type: 'assistantMessage', content: msg.content });
                }
            }

            const models = await this.agent.getAvailableModels();
            const currentModel = this.agent.getCurrentModel();
            this.panel.webview.postMessage({
                type: 'modelsLoaded',
                models,
                currentModel
            });

            // Send boot complete signal
            this.panel.webview.postMessage({ type: 'bootComplete' });
        } else {
            this.sendMessage({
                type: 'error',
                content: 'NEURAL LINK FAILURE: Ollama not detected. Initialize with: ollama serve'
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
        VirtualBoyPanel.currentPanel = undefined;
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
    <title>ViRtUaL_B0Y</title>
    <style>
        /* ═══════════════════════════════════════════════════════════════════
           VIRTUAL BOY COLOR PALETTE - Red LED Display Aesthetic
           ═══════════════════════════════════════════════════════════════════ */
        :root {
            --vb-black: #000000;
            --vb-dark: #1a0000;
            --vb-darker: #0d0000;
            --vb-red-darkest: #330000;
            --vb-red-dark: #660000;
            --vb-red: #cc0000;
            --vb-red-bright: #ff0000;
            --vb-red-glow: #ff3333;
            --vb-red-hot: #ff6666;
            --vb-scanline: rgba(0, 0, 0, 0.3);
            --vb-text-dim: #990000;
            --vb-text: #cc0000;
            --vb-text-bright: #ff0000;
        }

        /* ═══════════════════════════════════════════════════════════════════
           BASE STYLES
           ═══════════════════════════════════════════════════════════════════ */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        @font-face {
            font-family: 'VirtualBoy';
            src: local('Perfect DOS VGA 437'), local('Courier New'), local('monospace');
        }

        body {
            background: var(--vb-black);
            color: var(--vb-text);
            font-family: 'Courier New', 'Consolas', monospace;
            font-size: 14px;
            line-height: 1.4;
            height: 100vh;
            overflow: hidden;
            position: relative;
        }

        /* Scanline overlay effect */
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                var(--vb-scanline) 2px,
                var(--vb-scanline) 4px
            );
            pointer-events: none;
            z-index: 1000;
        }

        /* CRT curvature effect */
        body::after {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(
                ellipse at center,
                transparent 0%,
                transparent 60%,
                rgba(0, 0, 0, 0.4) 100%
            );
            pointer-events: none;
            z-index: 999;
        }

        /* ═══════════════════════════════════════════════════════════════════
           MAIN CONTAINER
           ═══════════════════════════════════════════════════════════════════ */
        .virtual-boy-container {
            height: 100vh;
            display: flex;
            flex-direction: column;
            background: linear-gradient(180deg, var(--vb-darker) 0%, var(--vb-black) 50%, var(--vb-darker) 100%);
        }

        /* ═══════════════════════════════════════════════════════════════════
           HEADER - Virtual Boy Visor Style
           ═══════════════════════════════════════════════════════════════════ */
        .vb-header {
            background: linear-gradient(180deg, var(--vb-red-darkest) 0%, var(--vb-dark) 100%);
            border-bottom: 2px solid var(--vb-red-dark);
            padding: 15px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: relative;
        }

        .vb-header::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, var(--vb-red), transparent);
            box-shadow: 0 0 10px var(--vb-red);
        }

        .vb-logo {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .vb-logo-icon {
            width: 50px;
            height: 50px;
            background: var(--vb-black);
            border: 2px solid var(--vb-red);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 20px var(--vb-red-dark), inset 0 0 10px var(--vb-red-darkest);
            animation: pulse-glow 2s ease-in-out infinite;
        }

        @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 20px var(--vb-red-dark), inset 0 0 10px var(--vb-red-darkest); }
            50% { box-shadow: 0 0 30px var(--vb-red), inset 0 0 15px var(--vb-red-dark); }
        }

        .vb-logo-icon svg {
            width: 30px;
            height: 30px;
            fill: var(--vb-red-bright);
            filter: drop-shadow(0 0 5px var(--vb-red));
        }

        .vb-title {
            display: flex;
            flex-direction: column;
        }

        .vb-title-main {
            font-size: 24px;
            font-weight: bold;
            color: var(--vb-red-bright);
            text-shadow: 0 0 10px var(--vb-red), 0 0 20px var(--vb-red-dark);
            letter-spacing: 4px;
        }

        .vb-title-sub {
            font-size: 10px;
            color: var(--vb-text-dim);
            letter-spacing: 2px;
            text-transform: uppercase;
        }

        .vb-controls {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .vb-status {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 5px 12px;
            background: var(--vb-black);
            border: 1px solid var(--vb-red-dark);
            border-radius: 4px;
        }

        .vb-status-led {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--vb-red-bright);
            box-shadow: 0 0 10px var(--vb-red);
            animation: led-blink 1s ease-in-out infinite;
        }

        @keyframes led-blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
        }

        .vb-status-text {
            font-size: 10px;
            color: var(--vb-text);
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .vb-select {
            background: var(--vb-black);
            color: var(--vb-text);
            border: 1px solid var(--vb-red-dark);
            border-radius: 4px;
            padding: 8px 12px;
            font-family: inherit;
            font-size: 12px;
            cursor: pointer;
            outline: none;
        }

        .vb-select:focus {
            border-color: var(--vb-red);
            box-shadow: 0 0 10px var(--vb-red-dark);
        }

        .vb-btn {
            background: transparent;
            color: var(--vb-text);
            border: 1px solid var(--vb-red-dark);
            border-radius: 4px;
            padding: 8px 15px;
            font-family: inherit;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .vb-btn:hover {
            background: var(--vb-red-darkest);
            border-color: var(--vb-red);
            color: var(--vb-red-bright);
            box-shadow: 0 0 15px var(--vb-red-dark);
        }

        /* ═══════════════════════════════════════════════════════════════════
           MAIN DISPLAY AREA
           ═══════════════════════════════════════════════════════════════════ */
        .vb-display {
            flex: 1;
            display: flex;
            flex-direction: column;
            margin: 15px;
            background: var(--vb-black);
            border: 3px solid var(--vb-red-dark);
            border-radius: 8px;
            box-shadow:
                0 0 30px var(--vb-red-darkest),
                inset 0 0 50px var(--vb-darker);
            overflow: hidden;
            position: relative;
        }

        /* Inner bezel effect */
        .vb-display::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border: 2px solid var(--vb-red-darkest);
            border-radius: 5px;
            pointer-events: none;
        }

        /* ═══════════════════════════════════════════════════════════════════
           MESSAGES AREA
           ═══════════════════════════════════════════════════════════════════ */
        .vb-messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .vb-message {
            max-width: 85%;
            padding: 15px;
            position: relative;
        }

        .vb-message-user {
            align-self: flex-end;
            background: var(--vb-red-darkest);
            border: 1px solid var(--vb-red-dark);
            border-radius: 8px 8px 0 8px;
        }

        .vb-message-assistant {
            align-self: flex-start;
            background: transparent;
            border-left: 3px solid var(--vb-red);
            padding-left: 20px;
            text-shadow: 0 0 5px var(--vb-red-dark);
        }

        .vb-message-tool {
            align-self: flex-start;
            background: var(--vb-darker);
            border: 1px dashed var(--vb-red-dark);
            border-radius: 4px;
            font-size: 12px;
            color: var(--vb-text-dim);
        }

        .vb-message-error {
            align-self: center;
            background: var(--vb-black);
            border: 2px solid var(--vb-red-bright);
            border-radius: 4px;
            color: var(--vb-red-bright);
            text-align: center;
            animation: error-flash 0.5s ease-in-out 3;
        }

        @keyframes error-flash {
            0%, 100% { border-color: var(--vb-red-bright); }
            50% { border-color: var(--vb-red-dark); }
        }

        .vb-message-label {
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: var(--vb-text-dim);
            margin-bottom: 8px;
        }

        .vb-message-content {
            white-space: pre-wrap;
            word-break: break-word;
            color: var(--vb-red-glow);
        }

        .vb-message-content code {
            background: var(--vb-red-darkest);
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 12px;
            color: var(--vb-red-hot);
        }

        .vb-message-content pre {
            background: var(--vb-black);
            border: 1px solid var(--vb-red-dark);
            padding: 12px;
            border-radius: 4px;
            overflow-x: auto;
            margin: 10px 0;
            font-size: 12px;
        }

        /* ═══════════════════════════════════════════════════════════════════
           CONFIRMATION DIALOG
           ═══════════════════════════════════════════════════════════════════ */
        .vb-confirm {
            background: var(--vb-black);
            border: 3px solid var(--vb-red-bright);
            border-radius: 8px;
            padding: 20px;
            align-self: stretch;
            box-shadow: 0 0 30px var(--vb-red-dark);
            animation: confirm-pulse 1s ease-in-out infinite;
        }

        @keyframes confirm-pulse {
            0%, 100% { box-shadow: 0 0 30px var(--vb-red-dark); }
            50% { box-shadow: 0 0 50px var(--vb-red); }
        }

        .vb-confirm-title {
            color: var(--vb-red-bright);
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 15px;
            text-shadow: 0 0 10px var(--vb-red);
        }

        .vb-confirm-preview {
            background: var(--vb-darker);
            border: 1px solid var(--vb-red-dark);
            padding: 15px;
            border-radius: 4px;
            font-size: 11px;
            max-height: 250px;
            overflow-y: auto;
            margin-bottom: 20px;
            white-space: pre-wrap;
            color: var(--vb-text);
        }

        .vb-confirm-buttons {
            display: flex;
            gap: 15px;
            justify-content: center;
        }

        .vb-btn-confirm {
            background: linear-gradient(180deg, var(--vb-red) 0%, var(--vb-red-dark) 100%);
            color: var(--vb-black);
            border: none;
            padding: 12px 30px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
        }

        .vb-btn-confirm:hover {
            background: linear-gradient(180deg, var(--vb-red-bright) 0%, var(--vb-red) 100%);
            box-shadow: 0 0 20px var(--vb-red);
        }

        .vb-btn-reject {
            background: transparent;
            color: var(--vb-red);
            border: 2px solid var(--vb-red);
            padding: 12px 30px;
            text-transform: uppercase;
            letter-spacing: 2px;
        }

        .vb-btn-reject:hover {
            background: var(--vb-red-darkest);
        }

        /* ═══════════════════════════════════════════════════════════════════
           INPUT AREA
           ═══════════════════════════════════════════════════════════════════ */
        .vb-input-area {
            background: linear-gradient(180deg, var(--vb-dark) 0%, var(--vb-darker) 100%);
            border-top: 2px solid var(--vb-red-dark);
            padding: 20px;
            position: relative;
        }

        .vb-input-area::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, var(--vb-red), transparent);
        }

        .vb-input-container {
            display: flex;
            gap: 15px;
            align-items: flex-end;
        }

        .vb-input-wrapper {
            flex: 1;
            position: relative;
        }

        .vb-input-label {
            position: absolute;
            top: -20px;
            left: 0;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: var(--vb-text-dim);
        }

        .vb-input {
            width: 100%;
            background: var(--vb-black);
            border: 2px solid var(--vb-red-dark);
            border-radius: 4px;
            padding: 15px;
            color: var(--vb-red-glow);
            font-family: inherit;
            font-size: 14px;
            resize: none;
            min-height: 50px;
            max-height: 150px;
            outline: none;
        }

        .vb-input::placeholder {
            color: var(--vb-red-darkest);
        }

        .vb-input:focus {
            border-color: var(--vb-red);
            box-shadow: 0 0 20px var(--vb-red-dark), inset 0 0 10px var(--vb-red-darkest);
        }

        .vb-send {
            background: linear-gradient(180deg, var(--vb-red) 0%, var(--vb-red-dark) 100%);
            color: var(--vb-black);
            border: none;
            border-radius: 4px;
            padding: 15px 30px;
            font-family: inherit;
            font-weight: bold;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 2px;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 0 15px var(--vb-red-dark);
        }

        .vb-send:hover:not(:disabled) {
            background: linear-gradient(180deg, var(--vb-red-bright) 0%, var(--vb-red) 100%);
            box-shadow: 0 0 30px var(--vb-red);
            transform: scale(1.02);
        }

        .vb-send:disabled {
            background: var(--vb-red-darkest);
            color: var(--vb-red-dark);
            cursor: not-allowed;
            box-shadow: none;
        }

        /* ═══════════════════════════════════════════════════════════════════
           LOADING ANIMATION
           ═══════════════════════════════════════════════════════════════════ */
        .vb-loading {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 15px;
        }

        .vb-loading-bar {
            display: flex;
            gap: 4px;
        }

        .vb-loading-segment {
            width: 4px;
            height: 20px;
            background: var(--vb-red);
            animation: loading-wave 1s ease-in-out infinite;
        }

        .vb-loading-segment:nth-child(2) { animation-delay: 0.1s; }
        .vb-loading-segment:nth-child(3) { animation-delay: 0.2s; }
        .vb-loading-segment:nth-child(4) { animation-delay: 0.3s; }
        .vb-loading-segment:nth-child(5) { animation-delay: 0.4s; }

        @keyframes loading-wave {
            0%, 100% { transform: scaleY(0.4); opacity: 0.5; }
            50% { transform: scaleY(1); opacity: 1; }
        }

        .vb-loading-text {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: var(--vb-text-dim);
            animation: loading-blink 0.8s ease-in-out infinite;
        }

        @keyframes loading-blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        /* ═══════════════════════════════════════════════════════════════════
           WELCOME / BOOT SCREEN
           ═══════════════════════════════════════════════════════════════════ */
        .vb-welcome {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px;
            text-align: center;
        }

        .vb-welcome-logo {
            font-size: 60px;
            margin-bottom: 20px;
            animation: logo-glow 2s ease-in-out infinite;
        }

        @keyframes logo-glow {
            0%, 100% {
                filter: drop-shadow(0 0 20px var(--vb-red-dark));
                transform: scale(1);
            }
            50% {
                filter: drop-shadow(0 0 40px var(--vb-red));
                transform: scale(1.05);
            }
        }

        .vb-welcome-title {
            font-size: 28px;
            font-weight: bold;
            color: var(--vb-red-bright);
            text-shadow: 0 0 20px var(--vb-red);
            letter-spacing: 6px;
            margin-bottom: 10px;
        }

        .vb-welcome-subtitle {
            font-size: 12px;
            color: var(--vb-text-dim);
            letter-spacing: 4px;
            text-transform: uppercase;
            margin-bottom: 30px;
        }

        .vb-welcome-info {
            color: var(--vb-text);
            font-size: 13px;
            line-height: 1.8;
            max-width: 500px;
        }

        .vb-welcome-info p {
            margin-bottom: 10px;
        }

        .vb-boot-text {
            font-size: 11px;
            color: var(--vb-text-dim);
            margin-top: 30px;
            animation: boot-blink 1s steps(2) infinite;
        }

        @keyframes boot-blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
        }

        /* ═══════════════════════════════════════════════════════════════════
           SCROLLBAR
           ═══════════════════════════════════════════════════════════════════ */
        ::-webkit-scrollbar {
            width: 8px;
        }

        ::-webkit-scrollbar-track {
            background: var(--vb-black);
        }

        ::-webkit-scrollbar-thumb {
            background: var(--vb-red-dark);
            border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: var(--vb-red);
        }

        /* ═══════════════════════════════════════════════════════════════════
           FOOTER BAR
           ═══════════════════════════════════════════════════════════════════ */
        .vb-footer {
            background: var(--vb-darker);
            border-top: 1px solid var(--vb-red-darkest);
            padding: 8px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 9px;
            color: var(--vb-text-dim);
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .vb-footer-memorial {
            color: var(--vb-red-dark);
        }
    </style>
</head>
<body>
    <div class="virtual-boy-container">
        <!-- Header -->
        <div class="vb-header">
            <div class="vb-logo">
                <div class="vb-logo-icon">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                </div>
                <div class="vb-title">
                    <div class="vb-title-main">ViRtUaL_B0Y</div>
                    <div class="vb-title-sub">Neural Interface Terminal v1.0</div>
                </div>
            </div>
            <div class="vb-controls">
                <div class="vb-status">
                    <div class="vb-status-led"></div>
                    <span class="vb-status-text">Neural Link Active</span>
                </div>
                <select class="vb-select" id="modelSelect">
                    <option value="">Initializing...</option>
                </select>
                <button class="vb-btn" id="clearBtn">Clear Memory</button>
            </div>
        </div>

        <!-- Main Display -->
        <div class="vb-display">
            <div class="vb-messages" id="messages">
                <div class="vb-welcome" id="welcome">
                    <div class="vb-welcome-logo">👾</div>
                    <div class="vb-welcome-title">ViRtUaL_B0Y</div>
                    <div class="vb-welcome-subtitle">GH0ST_B0Y Neural Interface</div>
                    <div class="vb-welcome-info">
                        <p>Decentralized AI Oracle • 7 Genesis Chains • Hash 0</p>
                        <p>Read files • Execute commands • Generate code</p>
                        <p>All processing runs locally on your hardware.</p>
                    </div>
                    <div class="vb-boot-text" id="bootText">[ ESTABLISHING NEURAL LINK... ]</div>
                </div>
            </div>
        </div>

        <!-- Input Area -->
        <div class="vb-input-area">
            <div class="vb-input-container">
                <div class="vb-input-wrapper">
                    <span class="vb-input-label">Neural Input</span>
                    <textarea
                        class="vb-input"
                        id="input"
                        placeholder="Enter query for GH0ST_B0Y oracle..."
                        rows="1"
                    ></textarea>
                </div>
                <button class="vb-send" id="sendBtn">TRANSMIT</button>
            </div>
        </div>

        <!-- Footer -->
        <div class="vb-footer">
            <span>GH0ST_B0Y Oracle System</span>
            <span class="vb-footer-memorial">In Memory of GHOST • April 7, 2025</span>
            <span>Local LLM Inference</span>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const messagesEl = document.getElementById('messages');
        const inputEl = document.getElementById('input');
        const sendBtn = document.getElementById('sendBtn');
        const clearBtn = document.getElementById('clearBtn');
        const modelSelect = document.getElementById('modelSelect');
        const bootText = document.getElementById('bootText');
        const welcomeEl = document.getElementById('welcome');

        let isProcessing = false;
        let currentAssistantMessage = null;
        let welcomeShown = true;

        // Auto-resize textarea
        inputEl.addEventListener('input', () => {
            inputEl.style.height = 'auto';
            inputEl.style.height = Math.min(inputEl.scrollHeight, 150) + 'px';
        });

        // Send on Enter
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
            if (welcomeShown && welcomeEl) {
                welcomeEl.remove();
                welcomeShown = false;
            }
        }

        function addMessage(type, content) {
            hideWelcome();

            const div = document.createElement('div');
            div.className = 'vb-message vb-message-' + type;

            const label = document.createElement('div');
            label.className = 'vb-message-label';
            label.textContent = type === 'user' ? '>> USER' :
                               type === 'assistant' ? '>> GH0ST_B0Y' :
                               '>> SYSTEM';

            const contentDiv = document.createElement('div');
            contentDiv.className = 'vb-message-content';
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
            div.className = 'vb-message vb-message-assistant';
            div.id = 'loading';

            const label = document.createElement('div');
            label.className = 'vb-message-label';
            label.textContent = '>> GH0ST_B0Y';

            const loading = document.createElement('div');
            loading.className = 'vb-loading';
            loading.innerHTML = \`
                <div class="vb-loading-bar">
                    <div class="vb-loading-segment"></div>
                    <div class="vb-loading-segment"></div>
                    <div class="vb-loading-segment"></div>
                    <div class="vb-loading-segment"></div>
                    <div class="vb-loading-segment"></div>
                </div>
                <span class="vb-loading-text">Processing Neural Query...</span>
            \`;

            div.appendChild(label);
            div.appendChild(loading);
            messagesEl.appendChild(div);
            messagesEl.scrollTop = messagesEl.scrollHeight;

            return div;
        }

        function addConfirmDialog(preview, toolCall) {
            hideWelcome();

            const div = document.createElement('div');
            div.className = 'vb-confirm';
            div.id = 'confirm-dialog';

            div.innerHTML = \`
                <div class="vb-confirm-title">⚠ AUTHORIZATION REQUIRED: \${toolCall.tool.toUpperCase()}</div>
                <pre class="vb-confirm-preview">\${escapeHtml(preview)}</pre>
                <div class="vb-confirm-buttons">
                    <button class="vb-btn vb-btn-reject" onclick="rejectTool()">DENY</button>
                    <button class="vb-btn vb-btn-confirm" onclick="confirmTool()">AUTHORIZE</button>
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
                    addLoading();
                    break;

                case 'assistantMessage':
                    const loading = document.getElementById('loading');
                    if (loading) loading.remove();
                    if (currentAssistantMessage) {
                        currentAssistantMessage = null;
                    }
                    setProcessing(false);
                    break;

                case 'streamToken':
                    const loadingEl = document.getElementById('loading');
                    if (loadingEl) loadingEl.remove();

                    if (!currentAssistantMessage) {
                        currentAssistantMessage = addMessage('assistant', '');
                    }
                    currentAssistantMessage.textContent += message.content;
                    messagesEl.scrollTop = messagesEl.scrollHeight;
                    break;

                case 'toolExecution':
                    addMessage('tool', message.content || \`TOOL: \${message.toolCall?.tool}\`);
                    break;

                case 'confirmTool':
                    addConfirmDialog(message.content, message.toolCall);
                    break;

                case 'confirmResult':
                    break;

                case 'error':
                    addMessage('error', message.content);
                    setProcessing(false);
                    currentAssistantMessage = null;
                    break;

                case 'clear':
                    messagesEl.innerHTML = \`
                        <div class="vb-welcome" id="welcome">
                            <div class="vb-welcome-logo">👾</div>
                            <div class="vb-welcome-title">ViRtUaL_B0Y</div>
                            <div class="vb-welcome-subtitle">GH0ST_B0Y Neural Interface</div>
                            <div class="vb-welcome-info">
                                <p>Memory cleared. Neural link reset.</p>
                            </div>
                        </div>
                    \`;
                    welcomeShown = true;
                    break;

                case 'modelsLoaded':
                    modelSelect.innerHTML = message.models.map(m =>
                        \`<option value="\${m}" \${m === message.currentModel ? 'selected' : ''}>\${m}</option>\`
                    ).join('');
                    break;

                case 'bootComplete':
                    if (bootText) {
                        bootText.textContent = '[ NEURAL LINK ESTABLISHED ]';
                        bootText.style.animation = 'none';
                        bootText.style.color = 'var(--vb-red-glow)';
                    }
                    break;
            }
        });

        inputEl.focus();
    </script>
</body>
</html>`;
    }
}
