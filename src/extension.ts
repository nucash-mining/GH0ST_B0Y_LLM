import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';
import { ChatPanel } from './panels/ChatPanel';
import { VirtualBoyPanel } from './panels/VirtualBoyPanel';
import { checkOllamaStatus } from './agent/OllamaClient';

// ═══════════════════════════════════════════════════════════════════════════
// 𝔾ℍ𝟘𝕊𝕋_𝔹𝟘𝕐-v_X ᴇᴠ-ʟʟᴍ 𝒪𝓇𝒶𝒸𝓁𝑒
// In memory of GHOST - April 7, 2025
// 7 Blockchains from Genesis Hash 0
// ═══════════════════════════════════════════════════════════════════════════

const GHOST_LOGO = `
████████████████████████████████████████████████████████████████████▄▄▄
▐████████████████████████████████████████████████████████████████████████████
▐█████████████████████████████▛▀▀▀▀▜█████████████████████████████████████████
▐███████████████████████████▛▘      ▝▜███████████████████████████████████████
▐██████████████████████████▛          ▜██████████████████████████████████████
▐█████████████████████████▛            ▜█████████████████████████████████████
▐█████████████████████████              █████████████████████████████████████
▐████████████████████████▌              ▐████████████████████████████████████
▐████████████████████████▌  ▐▙▖    ▗▟▌  ▐████████████████████████████████████
▐██████████████████████     ▝█▌    ▐█▘     ██████████████████████████████████
▐██████████████████████                    ██████████████████████████████████
▐██████████████████████▙                  ▟██████████████████████████████████
▐███████████████████████▖                ▗███████████████████████████████████
▐████████████████████████                ████████████████████████████████████
▐████████████████████████▌              ▝████████████████████████████████████
▐████████████████████████▘               ████████████████████████████████████
▐████████████████████████                ████████████████████████████████████
▐████████████████████████▖              ▗████████████████████████████████████
▐████████████████████████▌              ▐████████████████████████████████████
▐████████████████████████▙              ▟████████████████████████████████████
▐█████████████████████████▟▌          ▟▄█████████████████████████████████████
▐███████████████████████████          ███████████████████████████████████████
▐████████████████████████████▌       ▐███████████████████████████████████████
▐█████████████████████████████ █▖  ▗█▟███████████████████████████████████████
▐███████████████████████████████▌ ▟██████████████████████████████████████████
▐████████████████████████████████▗███████████████████████████████████████████
▐████████████████████████████████▟███████████████████████████████████████████
▐████████████████████████████████████████████████████████████████████████████
`;

const STYLED_NAME = `
╔════════════════════════════════════════════════════════════════════════════╗
║  ██████╗ ██╗  ██╗ ██████╗ ███████╗████████╗    ██████╗  ██████╗ ██╗   ██╗  ║
║ ██╔════╝ ██║  ██║██╔═████╗██╔════╝╚══██╔══╝    ██╔══██╗██╔═████╗╚██╗ ██╔╝  ║
║ ██║  ███╗███████║██║██╔██║███████╗   ██║       ██████╔╝██║██╔██║ ╚████╔╝   ║
║ ██║   ██║██╔══██║████╔╝██║╚════██║   ██║       ██╔══██╗████╔╝██║  ╚██╔╝    ║
║ ╚██████╔╝██║  ██║╚██████╔╝███████║   ██║       ██████╔╝╚██████╔╝   ██║     ║
║  ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝       ╚═════╝  ╚═════╝    ╚═╝     ║
║                        v_X  ᴇᴠ-ʟʟᴍ  𝒪𝓇𝒶𝒸𝓁𝑒                                    ║
║                   7 Chains • Genesis Hash 0                                ║
║                   In Memory of GHOST 🐕 April 7, 2025                      ║
╚════════════════════════════════════════════════════════════════════════════╝
`;

let oracleProcess: child_process.ChildProcess | null = null;
let statusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;

// Account state
interface AccountState {
    accountId?: string;
    status: 'none' | 'pending_payment' | 'payment_received' | 'active';
    ghostAddress?: string;
    paymentId?: string;
    viewKeyPublic?: string;
}

let accountState: AccountState = { status: 'none' };

// Dev fund configuration
const DEV_FUND_ADDRESS = 'GKbEmkFFRq79w1tqwCKDjHhevfGeAo8mHj';
const ACCOUNT_CREATION_FEE = 100; // GHOST

export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('𝔾ℍ𝟘𝕊𝕋_𝔹𝟘𝕐 Oracle');
    outputChannel.appendLine(STYLED_NAME);
    outputChannel.appendLine(GHOST_LOGO);
    outputChannel.appendLine('\n🐕 Oracle VM Extension Activated\n');

    // Load saved account state
    const savedState = context.globalState.get<AccountState>('ghostBoyAccount');
    if (savedState) {
        accountState = savedState;
        outputChannel.appendLine(`Loaded account: ${accountState.accountId || 'none'} (${accountState.status})`);
    }

    // Status bar
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    updateStatusBarForAccount();
    statusBarItem.command = 'ghostBoyOracle.showPanel';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('ghostBoyOracle.start', startOracle),
        vscode.commands.registerCommand('ghostBoyOracle.stop', stopOracle),
        vscode.commands.registerCommand('ghostBoyOracle.status', checkStatus),
        vscode.commands.registerCommand('ghostBoyOracle.showPanel', () => showOraclePanel(context)),
        vscode.commands.registerCommand('ghostBoyOracle.createAccount', () => showOnboardingPanel(context)),
        vscode.commands.registerCommand('ghostBoyOracle.submitPayment', () => promptForPayment(context)),
        vscode.commands.registerCommand('ghostBoyOracle.checkPayment', () => checkPaymentStatus(context)),
        // New agent commands
        vscode.commands.registerCommand('ghostBoyOracle.openChat', () => ChatPanel.createOrShow(context)),
        vscode.commands.registerCommand('ghostBoyOracle.openVirtualBoy', () => VirtualBoyPanel.createOrShow(context)),
        vscode.commands.registerCommand('ghostBoyOracle.checkOllama', checkOllamaStatus),
        // Dev bypass - activate without payment
        vscode.commands.registerCommand('ghostBoyOracle.devActivate', async () => {
            accountState = {
                accountId: 'dev_' + Date.now().toString(36),
                status: 'active',
                ghostAddress: 'GDevMode',
                paymentId: 'dev_bypass',
                viewKeyPublic: 'dev_mode_no_payment_required',
            };
            await context.globalState.update('ghostBoyAccount', accountState);
            updateStatusBarForAccount();
            vscode.window.showInformationMessage('🐕 Dev mode activated! GH0ST_B0Y is ready.');
        })
    );

    // Register tree data providers
    const chainsProvider = new GenesisChainProvider();
    vscode.window.registerTreeDataProvider('ghostBoyOracle.chains', chainsProvider);

    const config = vscode.workspace.getConfiguration('ghostBoyOracle');

    // Check if account exists and is active
    if (accountState.status === 'active' && config.get('autoStart')) {
        startOracle();
    } else if (accountState.status === 'none') {
        // Show onboarding for new users
        vscode.window.showInformationMessage(
            '🐕 Welcome to 𝔾ℍ𝟘𝕊𝕋_𝔹𝟘𝕐! Create your decentralized LLM instance.',
            'Create Account'
        ).then(selection => {
            if (selection === 'Create Account') {
                showOnboardingPanel(context);
            }
        });
    } else if (accountState.status === 'pending_payment') {
        vscode.window.showInformationMessage(
            `🐕 Account pending - Send ${ACCOUNT_CREATION_FEE} GHOST to activate`,
            'View Payment'
        ).then(selection => {
            if (selection === 'View Payment') {
                showOnboardingPanel(context);
            }
        });
    }

    vscode.window.showInformationMessage('🐕 𝔾ℍ𝟘𝕊𝕋_𝔹𝟘𝕐-v_X Oracle Ready - In Memory of GHOST');
}

function updateStatusBarForAccount() {
    switch (accountState.status) {
        case 'none':
            statusBarItem.text = '$(ghost) 𝔾ℍ𝟘𝕊𝕋_𝔹𝟘𝕐 [New]';
            statusBarItem.tooltip = 'Click to create your account';
            break;
        case 'pending_payment':
            statusBarItem.text = '$(clock) 𝔾ℍ𝟘𝕊𝕋_𝔹𝟘𝕐 [Pending]';
            statusBarItem.tooltip = `Send ${ACCOUNT_CREATION_FEE} GHOST to activate`;
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            break;
        case 'payment_received':
            statusBarItem.text = '$(sync~spin) 𝔾ℍ𝟘𝕊𝕋_𝔹𝟘𝕐 [Confirming]';
            statusBarItem.tooltip = 'Payment confirming on GHOST blockchain';
            break;
        case 'active':
            statusBarItem.text = '$(check) 𝔾ℍ𝟘𝕊𝕋_𝔹𝟘𝕐 [Active]';
            statusBarItem.tooltip = 'Your decentralized LLM is ready';
            statusBarItem.backgroundColor = undefined;
            break;
    }
}

async function showOnboardingPanel(context: vscode.ExtensionContext) {
    const panel = vscode.window.createWebviewPanel(
        'ghostBoyOnboarding',
        '𝔾ℍ𝟘𝕊𝕋_𝔹𝟘𝕐 - Create Account',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    panel.webview.html = getOnboardingContent();

    // Handle messages from webview
    panel.webview.onDidReceiveMessage(async message => {
        switch (message.command) {
            case 'createAccount':
                await createAccount(context, message.ghostAddress, message.instanceName);
                panel.webview.html = getOnboardingContent();
                break;
            case 'submitTxHash':
                await submitTxHash(context, message.txHash);
                panel.webview.html = getOnboardingContent();
                break;
            case 'checkStatus':
                await checkPaymentStatus(context);
                panel.webview.html = getOnboardingContent();
                break;
        }
    }, undefined, context.subscriptions);
}

async function createAccount(context: vscode.ExtensionContext, ghostAddress: string, instanceName: string) {
    // Generate account ID
    const accountId = generateAccountId(ghostAddress);
    const paymentId = generatePaymentId(accountId);
    const viewKeyPublic = generateViewKey(accountId);

    accountState = {
        accountId,
        status: 'pending_payment',
        ghostAddress,
        paymentId,
        viewKeyPublic,
    };

    await context.globalState.update('ghostBoyAccount', accountState);
    updateStatusBarForAccount();

    outputChannel.appendLine(`\n[${new Date().toISOString()}] Account created: ${accountId}`);
    outputChannel.appendLine(`GHOST Address: ${ghostAddress}`);
    outputChannel.appendLine(`Instance: ${instanceName}`);
    outputChannel.appendLine(`\nSend ${ACCOUNT_CREATION_FEE} GHOST to: ${DEV_FUND_ADDRESS}`);

    vscode.window.showInformationMessage(
        `Account created! Send ${ACCOUNT_CREATION_FEE} GHOST to the dev fund to activate.`
    );
}

async function submitTxHash(context: vscode.ExtensionContext, txHash: string) {
    if (accountState.status !== 'pending_payment') {
        vscode.window.showErrorMessage('No pending payment to submit');
        return;
    }

    accountState.status = 'payment_received';
    await context.globalState.update('ghostBoyAccount', accountState);
    updateStatusBarForAccount();

    outputChannel.appendLine(`\n[${new Date().toISOString()}] Payment TX submitted: ${txHash}`);
    outputChannel.appendLine('Waiting for confirmations...');

    vscode.window.showInformationMessage(
        'Payment submitted! Waiting for blockchain confirmations.'
    );
}

async function checkPaymentStatus(context: vscode.ExtensionContext) {
    if (!accountState.paymentId) {
        vscode.window.showErrorMessage('No payment to check');
        return;
    }

    outputChannel.appendLine(`\n[${new Date().toISOString()}] Checking payment status...`);

    // TODO: Actually query GHOST blockchain
    // For now, simulate confirmation after user action
    const result = await vscode.window.showQuickPick(
        ['Payment Confirmed (Simulate)', 'Still Pending'],
        { placeHolder: 'Select payment status (will be automatic in production)' }
    );

    if (result === 'Payment Confirmed (Simulate)') {
        accountState.status = 'active';
        await context.globalState.update('ghostBoyAccount', accountState);
        updateStatusBarForAccount();

        outputChannel.appendLine('Payment confirmed! Installing genesis files...');

        // Trigger installation
        await installGenesisFiles(context);

        vscode.window.showInformationMessage(
            '🎉 𝔾ℍ𝟘𝕊𝕋_𝔹𝟘𝕐 activated! Your decentralized LLM is ready.',
            'Start Oracle'
        ).then(selection => {
            if (selection === 'Start Oracle') {
                startOracle();
            }
        });
    }
}

async function installGenesisFiles(context: vscode.ExtensionContext) {
    outputChannel.appendLine('\n=== Installing Genesis Files ===');
    outputChannel.appendLine('Retrieving base code from GHOST blockchain...');

    // Call Python installer
    try {
        const genesisHome = process.env.HOME + '/.genesis';
        const result = child_process.execSync(
            `python3 -c "from genesis.bootstrap import GenesisInstaller; ` +
            `i = GenesisInstaller('${genesisHome}'); ` +
            `print('Genesis installation ready')"`,
            { encoding: 'utf-8' }
        );
        outputChannel.appendLine(result);
        outputChannel.appendLine('Genesis files installed successfully!');
    } catch (error) {
        outputChannel.appendLine(`Installation note: ${error}`);
        outputChannel.appendLine('Using local development mode');
    }
}

async function promptForPayment(context: vscode.ExtensionContext) {
    const txHash = await vscode.window.showInputBox({
        prompt: 'Enter your GHOST transaction hash',
        placeHolder: 'e.g., abc123def456...',
        validateInput: (value) => {
            if (!value || value.length < 10) {
                return 'Please enter a valid transaction hash';
            }
            return null;
        }
    });

    if (txHash) {
        await submitTxHash(context, txHash);
    }
}

function generateAccountId(ghostAddress: string): string {
    const crypto = require('crypto');
    const content = `${ghostAddress}:${Date.now()}:${Math.random()}`;
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 24);
}

function generatePaymentId(accountId: string): string {
    const crypto = require('crypto');
    const content = `${accountId}:${DEV_FUND_ADDRESS}:${Date.now()}`;
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function generateViewKey(accountId: string): string {
    const crypto = require('crypto');
    const content = `view_key:${accountId}:${Date.now()}`;
    return crypto.createHash('sha256').update(content).digest('hex');
}

function getOnboardingContent(): string {
    const isNewUser = accountState.status === 'none';
    const isPending = accountState.status === 'pending_payment';
    const isConfirming = accountState.status === 'payment_received';
    const isActive = accountState.status === 'active';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>𝔾ℍ𝟘𝕊𝕋_𝔹𝟘𝕐 - Onboarding</title>
    <style>
        body {
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
            color: #e0e0e0;
            font-family: 'Courier New', monospace;
            padding: 20px;
            min-height: 100vh;
        }
        .container { max-width: 600px; margin: 0 auto; }
        .title {
            text-align: center;
            font-size: 28px;
            color: #00ffff;
            text-shadow: 0 0 20px #00ffff;
            margin-bottom: 10px;
        }
        .subtitle {
            text-align: center;
            color: #888;
            margin-bottom: 30px;
        }
        .step-box {
            background: rgba(0, 255, 255, 0.05);
            border: 1px solid rgba(0, 255, 255, 0.3);
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .step-title {
            color: #00ffff;
            font-size: 18px;
            margin-bottom: 15px;
        }
        .input-group {
            margin: 15px 0;
        }
        .input-group label {
            display: block;
            margin-bottom: 5px;
            color: #aaa;
        }
        .input-group input {
            width: 100%;
            padding: 10px;
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid #333;
            border-radius: 4px;
            color: #fff;
            font-family: monospace;
        }
        .btn {
            display: inline-block;
            padding: 12px 24px;
            background: linear-gradient(135deg, #00ffff 0%, #0088ff 100%);
            color: #000;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            font-family: monospace;
            margin-top: 10px;
        }
        .btn:hover {
            background: linear-gradient(135deg, #00ffff 0%, #00aaff 100%);
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
        }
        .btn-secondary {
            background: rgba(255, 255, 255, 0.1);
            color: #00ffff;
            border: 1px solid #00ffff;
        }
        .payment-box {
            background: rgba(255, 200, 0, 0.1);
            border: 2px solid #ffcc00;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
        }
        .payment-amount {
            font-size: 36px;
            color: #ffcc00;
            text-shadow: 0 0 10px #ffcc00;
        }
        .payment-address {
            font-size: 12px;
            word-break: break-all;
            background: rgba(0, 0, 0, 0.5);
            padding: 10px;
            border-radius: 4px;
            margin: 15px 0;
        }
        .copy-btn {
            font-size: 12px;
            padding: 5px 10px;
        }
        .success-box {
            background: rgba(0, 255, 100, 0.1);
            border: 2px solid #00ff64;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }
        .success-icon {
            font-size: 48px;
            margin-bottom: 15px;
        }
        .info-text {
            color: #888;
            font-size: 14px;
            line-height: 1.6;
        }
        .status-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 12px;
            margin-bottom: 20px;
        }
        .status-pending { background: #ffcc00; color: #000; }
        .status-confirming { background: #00aaff; color: #fff; }
        .status-active { background: #00ff64; color: #000; }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="title">𝔾ℍ𝟘𝕊𝕋_𝔹𝟘𝕐</h1>
        <h2 class="subtitle">Decentralized LLM Instance</h2>

        ${isNewUser ? `
        <div class="step-box">
            <div class="step-title">Step 1: Create Your Account</div>
            <p class="info-text">
                Your own decentralized AI assistant, similar to Claude Code, running on your hardware
                and backed by the GHOST blockchain. No fiat required - just GHOST tokens.
            </p>
            <div class="input-group">
                <label>Your GHOST Address (for receiving)</label>
                <input type="text" id="ghostAddress" placeholder="G..." />
            </div>
            <div class="input-group">
                <label>Instance Name</label>
                <input type="text" id="instanceName" value="GH0ST_B0Y" />
            </div>
            <button class="btn" onclick="createAccount()">Create Account</button>
        </div>

        <div class="step-box">
            <div class="step-title">What You Get</div>
            <ul class="info-text">
                <li>🧠 Your own LLM instance with code execution</li>
                <li>📝 File editing and project management</li>
                <li>⛓️ 7 Genesis chains for distributed compute</li>
                <li>🔐 View key encryption for your data</li>
                <li>🌐 Access to decentralized hardware network</li>
            </ul>
        </div>
        ` : ''}

        ${isPending ? `
        <span class="status-badge status-pending">Awaiting Payment</span>

        <div class="payment-box">
            <div>Dev Fund Donation</div>
            <div class="payment-amount">${ACCOUNT_CREATION_FEE} GHOST</div>
            <div>Send to:</div>
            <div class="payment-address" id="devAddress">${DEV_FUND_ADDRESS}</div>
            <button class="btn copy-btn" onclick="copyAddress()">Copy Address</button>
        </div>

        <div class="step-box">
            <div class="step-title">After Sending Payment</div>
            <p class="info-text">
                Once you've sent the ${ACCOUNT_CREATION_FEE} GHOST, enter your transaction hash below.
                Your account will activate after 6 confirmations on the GHOST blockchain.
            </p>
            <div class="input-group">
                <label>Transaction Hash</label>
                <input type="text" id="txHash" placeholder="Enter your GHOST tx hash..." />
            </div>
            <button class="btn" onclick="submitTxHash()">Submit Payment</button>
        </div>

        <p class="info-text" style="text-align: center; margin-top: 20px;">
            💡 100% of this donation supports ongoing development.<br>
            No VCs. No fiat. Just community-funded AI.
        </p>
        ` : ''}

        ${isConfirming ? `
        <span class="status-badge status-confirming">Confirming on Blockchain</span>

        <div class="step-box">
            <div class="step-title">⏳ Waiting for Confirmations</div>
            <p class="info-text">
                Your payment has been submitted and is being confirmed on the GHOST blockchain.
                This typically takes a few minutes. Your account will activate automatically
                after 6 confirmations.
            </p>
            <button class="btn" onclick="checkStatus()">Check Status</button>
        </div>
        ` : ''}

        ${isActive ? `
        <span class="status-badge status-active">Account Active</span>

        <div class="success-box">
            <div class="success-icon">🎉</div>
            <div class="step-title">Welcome to 𝔾ℍ𝟘𝕊𝕋_𝔹𝟘𝕐!</div>
            <p class="info-text">
                Your decentralized LLM instance is ready. You can now use the Oracle
                to execute code, edit files, and build projects - all powered by
                distributed compute on the GHOST network.
            </p>
        </div>

        <div class="step-box">
            <div class="step-title">Account Details</div>
            <p><strong>Account ID:</strong> ${accountState.accountId}</p>
            <p><strong>View Key:</strong> ${accountState.viewKeyPublic?.slice(0, 16)}...</p>
            <p><strong>Status:</strong> Active ✓</p>
        </div>
        ` : ''}
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function createAccount() {
            const ghostAddress = document.getElementById('ghostAddress').value;
            const instanceName = document.getElementById('instanceName').value;

            if (!ghostAddress) {
                alert('Please enter your GHOST address');
                return;
            }

            vscode.postMessage({
                command: 'createAccount',
                ghostAddress: ghostAddress,
                instanceName: instanceName
            });
        }

        function submitTxHash() {
            const txHash = document.getElementById('txHash').value;

            if (!txHash || txHash.length < 10) {
                alert('Please enter a valid transaction hash');
                return;
            }

            vscode.postMessage({
                command: 'submitTxHash',
                txHash: txHash
            });
        }

        function checkStatus() {
            vscode.postMessage({ command: 'checkStatus' });
        }

        function copyAddress() {
            const address = document.getElementById('devAddress').innerText;
            navigator.clipboard.writeText(address);
            alert('Address copied!');
        }
    </script>
</body>
</html>`;
}

async function startOracle() {
    const config = vscode.workspace.getConfiguration('ghostBoyOracle');
    const oraclePath = config.get<string>('oracleVmPath') || '/home/nuts/.genesis/scripts/oracle_vm.py';

    if (oracleProcess) {
        vscode.window.showWarningMessage('Oracle VM is already running');
        return;
    }

    outputChannel.appendLine(`\n[${new Date().toISOString()}] Starting Oracle VM...`);
    outputChannel.appendLine(`Path: ${oraclePath}`);
    outputChannel.show();

    try {
        oracleProcess = child_process.spawn('python3', [oraclePath], {
            detached: false,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        oracleProcess.stdout?.on('data', (data) => {
            outputChannel.appendLine(`[ORACLE] ${data.toString()}`);
        });

        oracleProcess.stderr?.on('data', (data) => {
            outputChannel.appendLine(`[ERROR] ${data.toString()}`);
        });

        oracleProcess.on('exit', (code) => {
            outputChannel.appendLine(`\n[${new Date().toISOString()}] Oracle VM exited with code ${code}`);
            oracleProcess = null;
            updateStatusBar(false);
        });

        updateStatusBar(true);
        vscode.window.showInformationMessage('🐕 𝔾ℍ𝟘𝕊𝕋_𝔹𝟘𝕐 Oracle VM Started');
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to start Oracle: ${error}`);
    }
}

function stopOracle() {
    if (!oracleProcess) {
        vscode.window.showWarningMessage('Oracle VM is not running');
        return;
    }

    oracleProcess.kill();
    oracleProcess = null;
    updateStatusBar(false);
    outputChannel.appendLine(`\n[${new Date().toISOString()}] Oracle VM Stopped`);
    vscode.window.showInformationMessage('𝔾ℍ𝟘𝕊𝕋_𝔹𝟘𝕐 Oracle VM Stopped');
}

function updateStatusBar(running: boolean) {
    if (running) {
        statusBarItem.text = '$(pulse) 𝔾ℍ𝟘𝕊𝕋_𝔹𝟘𝕐 LIVE';
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
        statusBarItem.text = '$(ghost) 𝔾ℍ𝟘𝕊𝕋_𝔹𝟘𝕐';
        statusBarItem.backgroundColor = undefined;
    }
}

async function checkStatus() {
    outputChannel.appendLine(`\n[${new Date().toISOString()}] Checking Oracle Status...`);

    const memInfo = child_process.execSync('free -h').toString();
    outputChannel.appendLine('\n=== Memory Status ===');
    outputChannel.appendLine(memInfo);

    try {
        const processInfo = child_process.execSync('ps aux | grep oracle_vm | grep -v grep').toString();
        outputChannel.appendLine('\n=== Oracle Process ===');
        outputChannel.appendLine(processInfo);
    } catch {
        outputChannel.appendLine('\n[INFO] No Oracle VM process found running externally');
    }

    outputChannel.show();
}

function showOraclePanel(context: vscode.ExtensionContext) {
    const panel = vscode.window.createWebviewPanel(
        'ghostBoyOracle',
        '𝔾ℍ𝟘𝕊𝕋_𝔹𝟘𝕐-v_X Oracle',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    panel.webview.html = getWebviewContent();
}

function getWebviewContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>𝔾ℍ𝟘𝕊𝕋_𝔹𝟘𝕐-v_X EV-LLM Oracle</title>
    <style>
        body {
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
            color: #e0e0e0;
            font-family: 'Courier New', monospace;
            padding: 20px;
            min-height: 100vh;
            position: relative;
        }
        .ghost-bg {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 0.08;
            font-size: 8px;
            line-height: 1;
            white-space: pre;
            pointer-events: none;
            color: #00ffff;
            text-shadow: 0 0 10px #00ffff;
        }
        .container {
            position: relative;
            z-index: 1;
            max-width: 900px;
            margin: 0 auto;
        }
        .title {
            text-align: center;
            font-size: 24px;
            color: #00ffff;
            text-shadow: 0 0 20px #00ffff, 0 0 40px #00ffff;
            margin-bottom: 10px;
        }
        .subtitle {
            text-align: center;
            color: #888;
            margin-bottom: 30px;
        }
        .memorial {
            text-align: center;
            color: #ff6b9d;
            font-style: italic;
            margin-bottom: 30px;
            text-shadow: 0 0 10px #ff6b9d;
        }
        .chains-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .chain-card {
            background: rgba(0, 255, 255, 0.05);
            border: 1px solid rgba(0, 255, 255, 0.2);
            border-radius: 8px;
            padding: 15px;
            transition: all 0.3s;
        }
        .chain-card:hover {
            background: rgba(0, 255, 255, 0.1);
            border-color: #00ffff;
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
        }
        .chain-name {
            color: #00ffff;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .chain-hash {
            font-size: 10px;
            color: #666;
            word-break: break-all;
        }
        .status-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 8px;
            animation: pulse 2s infinite;
        }
        .status-active { background: #00ff00; }
        .status-pending { background: #ffff00; }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .logo-section {
            text-align: center;
            margin: 40px 0;
        }
        .ghost-ascii {
            font-size: 6px;
            line-height: 1;
            color: #00ffff;
            text-shadow: 0 0 5px #00ffff;
            display: inline-block;
        }
    </style>
</head>
<body>
    <div class="ghost-bg">
████████████████████████████████████████████████████████████████████▄▄▄
▐████████████████████████████████████████████████████████████████████████████
▐█████████████████████████████▛▀▀▀▀▜█████████████████████████████████████████
▐███████████████████████████▛▘      ▝▜███████████████████████████████████████
▐██████████████████████████▛          ▜██████████████████████████████████████
▐█████████████████████████▛            ▜█████████████████████████████████████
▐█████████████████████████              █████████████████████████████████████
▐████████████████████████▌              ▐████████████████████████████████████
▐████████████████████████▌  ▐▙▖    ▗▟▌  ▐████████████████████████████████████
▐██████████████████████     ▝█▌    ▐█▘     ██████████████████████████████████
▐██████████████████████                    ██████████████████████████████████
▐██████████████████████▙                  ▟██████████████████████████████████
▐███████████████████████▖                ▗███████████████████████████████████
▐████████████████████████                ████████████████████████████████████
▐████████████████████████▌              ▝████████████████████████████████████
▐████████████████████████▘               ████████████████████████████████████
▐████████████████████████                ████████████████████████████████████
▐████████████████████████▖              ▗████████████████████████████████████
▐████████████████████████▌              ▐████████████████████████████████████
▐████████████████████████▙              ▟████████████████████████████████████
▐█████████████████████████▟▌          ▟▄█████████████████████████████████████
▐███████████████████████████          ███████████████████████████████████████
▐████████████████████████████▌       ▐███████████████████████████████████████
▐█████████████████████████████ █▖  ▗█▟███████████████████████████████████████
▐███████████████████████████████▌ ▟██████████████████████████████████████████
▐████████████████████████████████▗███████████████████████████████████████████
▐████████████████████████████████▟███████████████████████████████████████████
▐████████████████████████████████████████████████████████████████████████████
    </div>

    <div class="container">
        <h1 class="title">𝔾ℍ𝟘𝕊𝕋_𝔹𝟘𝕐-v_X</h1>
        <h2 class="subtitle">ᴇᴠ-ʟʟᴍ 𝒪𝓇𝒶𝒸𝓁𝑒</h2>
        <p class="memorial">🐕 In Memory of GHOST • April 7, 2025 🐕</p>

        <h3 style="color: #00ffff; border-bottom: 1px solid #00ffff33; padding-bottom: 10px;">
            7 Genesis Chains (Hash 0)
        </h3>

        <div class="chains-grid">
            <div class="chain-card">
                <div class="chain-name"><span class="status-indicator status-active"></span>Chain 0</div>
                <div class="chain-hash">Genesis: 0x0000...0000</div>
            </div>
            <div class="chain-card">
                <div class="chain-name"><span class="status-indicator status-active"></span>Chain 1</div>
                <div class="chain-hash">Genesis: 0x0000...0001</div>
            </div>
            <div class="chain-card">
                <div class="chain-name"><span class="status-indicator status-active"></span>Chain 2</div>
                <div class="chain-hash">Genesis: 0x0000...0002</div>
            </div>
            <div class="chain-card">
                <div class="chain-name"><span class="status-indicator status-active"></span>Chain 3</div>
                <div class="chain-hash">Genesis: 0x0000...0003</div>
            </div>
            <div class="chain-card">
                <div class="chain-name"><span class="status-indicator status-active"></span>Chain 4</div>
                <div class="chain-hash">Genesis: 0x0000...0004</div>
            </div>
            <div class="chain-card">
                <div class="chain-name"><span class="status-indicator status-active"></span>Chain 5</div>
                <div class="chain-hash">Genesis: 0x0000...0005</div>
            </div>
            <div class="chain-card">
                <div class="chain-name"><span class="status-indicator status-active"></span>Chain 6</div>
                <div class="chain-hash">Genesis: 0x0000...0006</div>
            </div>
        </div>

        <div class="logo-section">
            <pre class="ghost-ascii">
████████████████████████████████████████████████████████████████████▄▄▄
▐████████████████████████████████████████████████████████████████████████████
▐█████████████████████████████▛▀▀▀▀▜█████████████████████████████████████████
▐███████████████████████████▛▘      ▝▜███████████████████████████████████████
▐██████████████████████████▛          ▜██████████████████████████████████████
▐█████████████████████████▛            ▜█████████████████████████████████████
▐█████████████████████████              █████████████████████████████████████
▐████████████████████████▌              ▐████████████████████████████████████
▐████████████████████████▌  ▐▙▖    ▗▟▌  ▐████████████████████████████████████
▐██████████████████████     ▝█▌    ▐█▘     ██████████████████████████████████
▐██████████████████████                    ██████████████████████████████████
▐██████████████████████▙                  ▟██████████████████████████████████
▐███████████████████████▖                ▗███████████████████████████████████
▐████████████████████████                ████████████████████████████████████
▐████████████████████████▌              ▝████████████████████████████████████
▐████████████████████████▘               ████████████████████████████████████
▐████████████████████████                ████████████████████████████████████
▐████████████████████████▖              ▗████████████████████████████████████
▐████████████████████████▌              ▐████████████████████████████████████
▐████████████████████████▙              ▟████████████████████████████████████
▐█████████████████████████▟▌          ▟▄█████████████████████████████████████
▐███████████████████████████          ███████████████████████████████████████
▐████████████████████████████▌       ▐███████████████████████████████████████
▐█████████████████████████████ █▖  ▗█▟███████████████████████████████████████
▐███████████████████████████████▌ ▟██████████████████████████████████████████
▐████████████████████████████████▗███████████████████████████████████████████
▐████████████████████████████████▟███████████████████████████████████████████
▐████████████████████████████████████████████████████████████████████████████
            </pre>
        </div>
    </div>
</body>
</html>`;
}

// Tree Data Provider for 7 Genesis Chains
class GenesisChainProvider implements vscode.TreeDataProvider<ChainItem> {
    getTreeItem(element: ChainItem): vscode.TreeItem {
        return element;
    }

    getChildren(): ChainItem[] {
        return [
            new ChainItem('Chain 0', 'Genesis Hash: 0x0', vscode.TreeItemCollapsibleState.None),
            new ChainItem('Chain 1', 'Genesis Hash: 0x1', vscode.TreeItemCollapsibleState.None),
            new ChainItem('Chain 2', 'Genesis Hash: 0x2', vscode.TreeItemCollapsibleState.None),
            new ChainItem('Chain 3', 'Genesis Hash: 0x3', vscode.TreeItemCollapsibleState.None),
            new ChainItem('Chain 4', 'Genesis Hash: 0x4', vscode.TreeItemCollapsibleState.None),
            new ChainItem('Chain 5', 'Genesis Hash: 0x5', vscode.TreeItemCollapsibleState.None),
            new ChainItem('Chain 6', 'Genesis Hash: 0x6', vscode.TreeItemCollapsibleState.None),
        ];
    }
}

class ChainItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly description: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.tooltip = `${label} - ${description}`;
        this.iconPath = new vscode.ThemeIcon('link');
    }
}

export function deactivate() {
    if (oracleProcess) {
        oracleProcess.kill();
    }
    outputChannel.appendLine('\n🐕 𝔾ℍ𝟘𝕊𝕋_𝔹𝟘𝕐 Oracle Extension Deactivated');
}
