# GH0ST_B0Y Node Agent Installer for Windows
# Usage: iex (irm https://ghost-boy-llm.vercel.app/install.ps1)
# Or with token: & ([scriptblock]::Create((irm https://ghost-boy-llm.vercel.app/install.ps1))) -Token "YOUR_TOKEN"

param([string]$Token = "")

Write-Host ""
Write-Host "  GH0ST_B0Y EV-LLM Node Agent" -ForegroundColor Cyan
Write-Host "  Installer for Windows" -ForegroundColor DarkCyan
Write-Host ""

# Check Python
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "[-] Python 3 required. Download from https://python.org" -ForegroundColor Red
    Write-Host "    Make sure to check 'Add Python to PATH' during install."
    exit 1
}

$InstallDir = "$env:USERPROFILE\.ghostboy"
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

Write-Host "[+] Downloading agent..." -ForegroundColor Cyan
Invoke-WebRequest "https://ghost-boy-llm.vercel.app/ghostboy-agent.py" -OutFile "$InstallDir\ghostboy-agent.py"

Write-Host "[+] Installing Python dependencies..." -ForegroundColor Cyan
python -m pip install rich --quiet

if (-not $Token) {
    Write-Host ""
    Write-Host "[?] Enter your agent token from ghost-boy-llm.vercel.app/contribute:" -ForegroundColor Yellow
    $Token = Read-Host
}

# Create launcher batch file
@"
@echo off
python "$InstallDir\ghostboy-agent.py" --token $Token
pause
"@ | Out-File -FilePath "$InstallDir\start.bat" -Encoding ASCII

# Create scheduled task for auto-start
$TaskName = "GhostBoyAgent"
$Action = New-ScheduledTaskAction -Execute "python" -Argument "`"$InstallDir\ghostboy-agent.py`" --token $Token"
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Settings = New-ScheduledTaskSettingsSet -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Force | Out-Null

Write-Host ""
Write-Host "[OK] GH0ST_B0Y Node Agent installed at $InstallDir" -ForegroundColor Green
Write-Host ""
Write-Host "  Run now:        $InstallDir\start.bat" -ForegroundColor White
Write-Host "  Auto-starts at login (Task Scheduler: $TaskName)" -ForegroundColor DarkGray
Write-Host ""
