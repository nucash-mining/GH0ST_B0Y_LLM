#!/usr/bin/env python3
"""
GH0ST_B0Y Node Agent v2
Connects your PC hardware to the decentralized EV-LLM network.
Usage: python3 ghostboy-agent.py --token YOUR_AGENT_TOKEN
"""

import argparse
import json
import os
import platform
import shutil
import subprocess
import sys
import time
import threading
import urllib.request
import urllib.error
from datetime import datetime

API_BASE = "https://ghost-boy-llm.vercel.app"
OLLAMA_BASE = "http://localhost:11434"
POLL_INTERVAL = 5      # seconds between job polls
HEARTBEAT_INTERVAL = 60


# ── Try to import rich; install if missing ────────────────────────────────────

def ensure_rich():
    try:
        import rich  # noqa
    except ImportError:
        print("[GH0ST_B0Y] Installing display library (rich)...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "rich", "-q"])

ensure_rich()

from rich.console import Console
from rich.layout import Layout
from rich.live import Live
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich import box

console = Console()


# ── Hardware detection ────────────────────────────────────────────────────────

def detect_gpu():
    # NVIDIA
    try:
        out = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader,nounits"],
            stderr=subprocess.DEVNULL, text=True
        ).strip().splitlines()
        if out:
            name, vram = out[0].split(", ")
            return name.strip(), int(float(vram.strip()))
    except Exception:
        pass
    # AMD ROCm
    try:
        out = subprocess.check_output(["rocm-smi", "--showproductname"], stderr=subprocess.DEVNULL, text=True)
        for line in out.splitlines():
            if "GPU" in line and ":" in line:
                return line.split(":")[-1].strip(), None
    except Exception:
        pass
    # AMD/Intel via lspci
    try:
        out = subprocess.check_output(["lspci"], stderr=subprocess.DEVNULL, text=True)
        for line in out.splitlines():
            if "VGA" in line or "3D" in line or "Display" in line:
                return line.split(":")[-1].strip(), None
    except Exception:
        pass
    return None, None


def detect_cpu():
    try:
        if platform.system() == "Linux":
            with open("/proc/cpuinfo") as f:
                for line in f:
                    if line.startswith("model name"):
                        return line.split(":", 1)[1].strip()
        elif platform.system() == "Darwin":
            return subprocess.check_output(["sysctl", "-n", "machdep.cpu.brand_string"], text=True).strip()
        elif platform.system() == "Windows":
            import winreg
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE,
                                  r"HARDWARE\DESCRIPTION\System\CentralProcessor\0")
            return winreg.QueryValueEx(key, "ProcessorNameString")[0]
    except Exception:
        pass
    return platform.processor() or "Unknown CPU"


def detect_ram_gb():
    try:
        if platform.system() == "Linux":
            with open("/proc/meminfo") as f:
                for line in f:
                    if line.startswith("MemTotal"):
                        return round(int(line.split()[1]) / 1024 / 1024)
        elif platform.system() == "Darwin":
            return round(int(subprocess.check_output(["sysctl", "-n", "hw.memsize"], text=True)) / 2**30)
        elif platform.system() == "Windows":
            import ctypes
            class MEMSTATUS(ctypes.Structure):
                _fields_ = [("dwLength", ctypes.c_ulong), ("dwMemoryLoad", ctypes.c_ulong),
                             ("dwTotalPhys", ctypes.c_size_t), ("dwAvailPhys", ctypes.c_size_t),
                             ("dwTotalPageFile", ctypes.c_size_t), ("dwAvailPageFile", ctypes.c_size_t),
                             ("dwTotalVirtual", ctypes.c_size_t), ("dwAvailVirtual", ctypes.c_size_t)]
            m = MEMSTATUS()
            ctypes.windll.kernel32.GlobalMemoryStatus(ctypes.byref(m))
            return round(m.dwTotalPhys / 2**30)
    except Exception:
        pass
    return None


def detect_storage_gb():
    try:
        return round(shutil.disk_usage("/").total / 2**30)
    except Exception:
        return None


def get_vram_used_mb():
    try:
        out = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=memory.used", "--format=csv,noheader,nounits"],
            stderr=subprocess.DEVNULL, text=True
        ).strip()
        return int(out.splitlines()[0].strip())
    except Exception:
        return None


# ── Ollama management ─────────────────────────────────────────────────────────

def is_ollama_running(base=None):
    base = base or OLLAMA_BASE
    try:
        urllib.request.urlopen(f"{base}/api/tags", timeout=3)
        return True
    except Exception:
        return False


def install_ollama():
    console.print("[cyan]Installing Ollama...[/cyan]")
    if platform.system() == "Linux":
        os.system("curl -fsSL https://ollama.com/install.sh | sh")
    elif platform.system() == "Darwin":
        console.print("[yellow]Download Ollama from https://ollama.com/download then restart this agent.[/yellow]")
        sys.exit(1)
    elif platform.system() == "Windows":
        console.print("[yellow]Download Ollama from https://ollama.com/download then restart this agent.[/yellow]")
        sys.exit(1)


def start_ollama():
    if is_ollama_running():
        return True
    if not shutil.which("ollama"):
        install_ollama()
    subprocess.Popen(["ollama", "serve"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(30):
        time.sleep(1)
        if is_ollama_running():
            return True
    return False


def get_loaded_models():
    try:
        with urllib.request.urlopen(f"{OLLAMA_BASE}/api/tags", timeout=5) as r:
            return [m["name"] for m in json.loads(r.read()).get("models", [])]
    except Exception:
        return []


def pick_default_model(vram_gb):
    if not vram_gb:
        return "llama3.2:3b"
    if vram_gb >= 48:
        return "llama3.1:70b"
    if vram_gb >= 24:
        return "mistral"
    if vram_gb >= 8:
        return "llama3.2"
    return "llama3.2:3b"


def pull_model(model):
    console.print(f"[cyan]Pulling {model} — this may take a few minutes...[/cyan]")
    os.system(f"ollama pull {model}")


def run_inference(messages, model):
    payload = json.dumps({"model": model, "messages": messages, "stream": False}).encode()
    req = urllib.request.Request(
        f"{OLLAMA_BASE}/api/chat",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=300) as r:
        data = json.loads(r.read())
        return data.get("message", {}).get("content", "")


# ── API calls ─────────────────────────────────────────────────────────────────

def api(method, path, data=None, token=None):
    url = f"{API_BASE}{path}"
    payload = json.dumps(data).encode() if data else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=payload, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read()), None
    except urllib.error.HTTPError as e:
        return None, f"HTTP {e.code}: {e.read().decode()}"
    except Exception as e:
        return None, str(e)


# ── State ─────────────────────────────────────────────────────────────────────

class AgentState:
    def __init__(self):
        self.lock = threading.Lock()
        self.status = "starting"
        self.gpu_model = None
        self.vram_gb = None
        self.vram_used_mb = None
        self.cpu_model = None
        self.ram_gb = None
        self.storage_gb = None
        self.models = []
        self.tokens_served = 0
        self.jobs_completed = 0
        self.jobs_failed = 0
        self.current_job = None
        self.last_heartbeat = None
        self.log_lines = []
        self.node_id = None
        self.earnings_usd = 0.0

    def log(self, msg, style="dim"):
        ts = datetime.now().strftime("%H:%M:%S")
        with self.lock:
            self.log_lines.append((ts, msg, style))
            if len(self.log_lines) > 20:
                self.log_lines.pop(0)

    def update(self, **kwargs):
        with self.lock:
            for k, v in kwargs.items():
                setattr(self, k, v)


state = AgentState()


# ── TUI ───────────────────────────────────────────────────────────────────────

def build_display():
    layout = Layout()
    layout.split_column(
        Layout(name="header", size=4),
        Layout(name="body"),
        Layout(name="log", size=10),
    )
    layout["body"].split_row(
        Layout(name="hardware"),
        Layout(name="network"),
        Layout(name="jobs"),
    )

    # Header
    title = Text()
    title.append("  𝔾ℍ𝟘𝕊𝕋_𝔹𝟘𝕐  ", style="bold cyan")
    title.append("EV-LLM NODE AGENT  ", style="dim cyan")
    status_color = {"running": "green", "starting": "yellow", "error": "red"}.get(state.status, "white")
    title.append(f"● {state.status.upper()}", style=f"bold {status_color}")
    layout["header"].update(Panel(title, box=box.HEAVY, border_style="cyan"))

    # Hardware panel
    hw = Table(show_header=False, box=None, padding=(0, 1))
    hw.add_column("k", style="dim cyan", no_wrap=True)
    hw.add_column("v", style="white")
    hw.add_row("GPU", state.gpu_model or "Not detected")
    if state.vram_gb:
        vram_str = f"{state.vram_gb} GB"
        if state.vram_used_mb:
            vram_str += f"  ({state.vram_used_mb} MB used)"
        hw.add_row("VRAM", vram_str)
    hw.add_row("CPU", (state.cpu_model or "Unknown")[:35])
    hw.add_row("RAM", f"{state.ram_gb} GB" if state.ram_gb else "Unknown")
    hw.add_row("Disk", f"{state.storage_gb} GB" if state.storage_gb else "Unknown")
    hw.add_row("Models", ", ".join(state.models) if state.models else "None loaded")
    layout["hardware"].update(Panel(hw, title="[cyan]Hardware[/cyan]", border_style="cyan"))

    # Network panel
    net = Table(show_header=False, box=None, padding=(0, 1))
    net.add_column("k", style="dim cyan", no_wrap=True)
    net.add_column("v", style="white")
    net.add_row("Node ID", (state.node_id or "Pending")[:20])
    hb = state.last_heartbeat
    net.add_row("Last ping", hb.strftime("%H:%M:%S") if hb else "Never")
    net.add_row("Tokens", f"{state.tokens_served:,}")
    net.add_row("Earned", f"${state.earnings_usd:.4f}")
    net.add_row("Ollama", "[green]online[/green]" if is_ollama_running() else "[red]offline[/red]")
    layout["network"].update(Panel(net, title="[cyan]Network[/cyan]", border_style="cyan"))

    # Jobs panel
    jobs = Table(show_header=False, box=None, padding=(0, 1))
    jobs.add_column("k", style="dim cyan", no_wrap=True)
    jobs.add_column("v", style="white")
    jobs.add_row("Completed", str(state.jobs_completed))
    jobs.add_row("Failed", str(state.jobs_failed))
    cur = state.current_job
    if cur:
        jobs.add_row("Current", f"[yellow]{cur[:16]}…[/yellow]")
    else:
        jobs.add_row("Current", "[dim]idle[/dim]")
    layout["jobs"].update(Panel(jobs, title="[cyan]Jobs[/cyan]", border_style="cyan"))

    # Log panel
    log_table = Table(show_header=False, box=None, padding=(0, 0))
    log_table.add_column("ts", style="dim", width=8)
    log_table.add_column("msg")
    with state.lock:
        for ts, msg, style in state.log_lines[-8:]:
            log_table.add_row(ts, Text(msg, style=style))
    layout["log"].update(Panel(log_table, title="[cyan]Activity[/cyan]", border_style="cyan"))

    return layout


# ── Worker threads ────────────────────────────────────────────────────────────

def heartbeat_loop(token, gpu_model, cpu_model, vram_gb, ram_gb):
    while True:
        models = get_loaded_models()
        data, err = api("POST", "/api/nodes/heartbeat", {
            "ollamaUrl": OLLAMA_BASE,
            "gpuModel": gpu_model,
            "cpuModel": cpu_model,
            "vramGb": vram_gb,
            "ramGb": ram_gb,
        }, token=token)
        if data and data.get("ok"):
            state.update(
                last_heartbeat=datetime.now(),
                models=models,
                node_id=data.get("nodeId", state.node_id),
                status="running",
            )
        else:
            state.log(f"Heartbeat failed: {err}", "red")
        time.sleep(HEARTBEAT_INTERVAL)


def job_loop(token):
    while True:
        try:
            data, err = api("GET", "/api/nodes/jobs", token=token)
            if err:
                state.log(f"Poll error: {err}", "red")
                time.sleep(POLL_INTERVAL)
                continue

            job = data.get("job") if data else None
            if not job:
                time.sleep(POLL_INTERVAL)
                continue

            job_id = job["id"]
            messages = job["messages"]
            model = job.get("model", "llama3.2")

            state.update(current_job=job_id)
            state.log(f"Job {job_id[:8]}… model={model}", "cyan")

            try:
                result = run_inference(messages, model)
                tokens = len(result.split()) * 2  # rough estimate

                api("POST", f"/api/nodes/jobs/{job_id}", {"result": result}, token=token)
                state.update(
                    jobs_completed=state.jobs_completed + 1,
                    tokens_served=state.tokens_served + tokens,
                    earnings_usd=state.earnings_usd + tokens / 100_000,
                    current_job=None,
                )
                state.log(f"Done {job_id[:8]}… +{tokens} tokens", "green")
            except Exception as e:
                api("POST", f"/api/nodes/jobs/{job_id}", {"failed": True}, token=token)
                state.update(jobs_failed=state.jobs_failed + 1, current_job=None)
                state.log(f"Job {job_id[:8]}… failed: {e}", "red")

        except Exception as e:
            state.log(f"Worker error: {e}", "red")
            time.sleep(POLL_INTERVAL)


def vram_monitor():
    while True:
        used = get_vram_used_mb()
        if used is not None:
            state.update(vram_used_mb=used)
        time.sleep(10)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="GH0ST_B0Y Node Agent")
    parser.add_argument("--token", required=True, help="Agent token from ghost-boy-llm.vercel.app/contribute")
    parser.add_argument("--ollama-url", default=OLLAMA_BASE)
    args = parser.parse_args()

    global OLLAMA_BASE
    OLLAMA_BASE = args.ollama_url

    console.print(Panel(
        "[bold cyan]𝔾ℍ𝟘𝕊𝕋_𝔹𝟘𝕐 Node Agent[/bold cyan]\n[dim]Initializing hardware detection...[/dim]",
        border_style="cyan"
    ))

    # Detect hardware
    state.log("Detecting hardware...", "cyan")
    gpu_model, vram_gb = detect_gpu()
    cpu_model = detect_cpu()
    ram_gb = detect_ram_gb()
    storage_gb = detect_storage_gb()

    state.update(
        gpu_model=gpu_model,
        vram_gb=vram_gb,
        cpu_model=cpu_model,
        ram_gb=ram_gb,
        storage_gb=storage_gb,
    )

    state.log(f"CPU: {cpu_model}", "cyan")
    if gpu_model:
        state.log(f"GPU: {gpu_model} ({vram_gb} GB VRAM)", "cyan")
    else:
        state.log("No GPU detected — CPU-only inference", "yellow")
    state.log(f"RAM: {ram_gb} GB  Storage: {storage_gb} GB", "cyan")

    # Start Ollama
    state.log("Starting Ollama...", "cyan")
    if not start_ollama():
        state.log("Ollama failed to start", "red")

    # Pull default model if none loaded
    models = get_loaded_models()
    if not models:
        model = pick_default_model(vram_gb)
        state.log(f"Pulling {model}...", "yellow")
        pull_model(model)
        models = get_loaded_models()
    state.update(models=models)
    state.log(f"Models ready: {', '.join(models)}", "green")

    # Start background threads
    threading.Thread(target=heartbeat_loop, args=(args.token, gpu_model, cpu_model, vram_gb, ram_gb), daemon=True).start()
    threading.Thread(target=job_loop, args=(args.token,), daemon=True).start()
    threading.Thread(target=vram_monitor, daemon=True).start()

    state.log("Connected to GH0ST_B0Y network", "green")
    state.update(status="running")

    # Live TUI
    try:
        with Live(build_display(), refresh_per_second=2, screen=True) as live:
            while True:
                live.update(build_display())
                time.sleep(0.5)
    except KeyboardInterrupt:
        console.print("\n[cyan]GH0ST_B0Y agent stopped.[/cyan]")


if __name__ == "__main__":
    main()
