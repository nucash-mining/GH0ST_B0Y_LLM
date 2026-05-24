#!/usr/bin/env python3
"""
GH0ST_B0Y Node Agent
Connects your PC hardware to the decentralized LLM network.
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
import urllib.request
import urllib.error

API_BASE = "https://ghost-boy-llm.vercel.app"
OLLAMA_BASE = "http://localhost:11434"
HEARTBEAT_INTERVAL = 60  # seconds


def log(msg):
    print(f"[GH0ST_B0Y] {msg}", flush=True)


# ── Hardware detection ────────────────────────────────────────────────────────

def detect_gpu():
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
    try:
        out = subprocess.check_output(
            ["rocm-smi", "--showproductname"], stderr=subprocess.DEVNULL, text=True
        )
        for line in out.splitlines():
            if "GPU" in line:
                return line.strip(), None
    except Exception:
        pass
    return None, None


def detect_cpu():
    try:
        if platform.system() == "Linux":
            with open("/proc/cpuinfo") as f:
                for line in f:
                    if line.startswith("model name"):
                        return line.split(":")[1].strip()
        elif platform.system() == "Darwin":
            out = subprocess.check_output(["sysctl", "-n", "machdep.cpu.brand_string"], text=True)
            return out.strip()
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
                        kb = int(line.split()[1])
                        return round(kb / 1024 / 1024)
        elif platform.system() == "Darwin":
            out = subprocess.check_output(["sysctl", "-n", "hw.memsize"], text=True)
            return round(int(out.strip()) / 1024 / 1024 / 1024)
        elif platform.system() == "Windows":
            import ctypes
            kernel32 = ctypes.windll.kernel32
            c_ulong = ctypes.c_ulong
            class MEMORYSTATUS(ctypes.Structure):
                _fields_ = [("dwLength", c_ulong), ("dwMemoryLoad", c_ulong),
                             ("dwTotalPhys", ctypes.c_size_t), ("dwAvailPhys", ctypes.c_size_t),
                             ("dwTotalPageFile", ctypes.c_size_t), ("dwAvailPageFile", ctypes.c_size_t),
                             ("dwTotalVirtual", ctypes.c_size_t), ("dwAvailVirtual", ctypes.c_size_t)]
            mem = MEMORYSTATUS()
            kernel32.GlobalMemoryStatus(ctypes.byref(mem))
            return round(mem.dwTotalPhys / 1024 / 1024 / 1024)
    except Exception:
        pass
    return None


def detect_storage_gb(path="/"):
    try:
        stat = shutil.disk_usage(path)
        return round(stat.total / 1024 / 1024 / 1024)
    except Exception:
        return None


# ── Ollama management ─────────────────────────────────────────────────────────

def is_ollama_running():
    try:
        urllib.request.urlopen(f"{OLLAMA_BASE}/api/tags", timeout=3)
        return True
    except Exception:
        return False


def install_ollama():
    log("Ollama not found — installing...")
    system = platform.system()
    if system == "Linux":
        os.system("curl -fsSL https://ollama.com/install.sh | sh")
    elif system == "Darwin":
        log("On macOS: download Ollama from https://ollama.com/download and run it, then restart this agent.")
        sys.exit(1)
    elif system == "Windows":
        log("On Windows: download Ollama from https://ollama.com/download and run it, then restart this agent.")
        sys.exit(1)


def start_ollama():
    if is_ollama_running():
        return
    if not shutil.which("ollama"):
        install_ollama()
    log("Starting Ollama...")
    subprocess.Popen(["ollama", "serve"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(30):
        time.sleep(1)
        if is_ollama_running():
            log("Ollama is running.")
            return
    log("WARNING: Ollama did not start in time. Continuing anyway...")


def get_loaded_models():
    try:
        with urllib.request.urlopen(f"{OLLAMA_BASE}/api/tags", timeout=5) as r:
            data = json.loads(r.read())
            return [m["name"] for m in data.get("models", [])]
    except Exception:
        return []


def pull_default_model(gpu_vram_gb):
    models = get_loaded_models()
    if models:
        log(f"Models available: {', '.join(models)}")
        return
    model = "llama3.2:3b"
    if gpu_vram_gb and gpu_vram_gb >= 8:
        model = "llama3.2"
    if gpu_vram_gb and gpu_vram_gb >= 24:
        model = "mistral"
    if gpu_vram_gb and gpu_vram_gb >= 48:
        model = "llama3.1:70b"
    log(f"No models found — pulling {model} (this may take a few minutes)...")
    os.system(f"ollama pull {model}")


# ── API calls ─────────────────────────────────────────────────────────────────

def api_post(path, data, token=None):
    url = f"{API_BASE}{path}"
    payload = json.dumps(data).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        log(f"API error {e.code}: {body}")
        return None
    except Exception as e:
        log(f"Network error: {e}")
        return None


def send_heartbeat(token, gpu_model, cpu_model, vram_gb, ram_gb):
    models = get_loaded_models()
    result = api_post("/api/nodes/heartbeat", {
        "ollamaUrl": OLLAMA_BASE,
        "gpuModel": gpu_model,
        "cpuModel": cpu_model,
        "vramGb": vram_gb,
        "ramGb": ram_gb,
        "modelsLoaded": models,
    }, token=token)
    if result and result.get("ok"):
        log(f"Heartbeat OK — models: {', '.join(result.get('modelsLoaded', []) or ['none'])}")
    else:
        log("Heartbeat failed — will retry next cycle")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="GH0ST_B0Y Node Agent")
    parser.add_argument("--token", required=True, help="Agent token from ghost-boy-llm.vercel.app/contribute")
    parser.add_argument("--ollama-url", default=OLLAMA_BASE, help="Ollama base URL (default: http://localhost:11434)")
    args = parser.parse_args()

    global OLLAMA_BASE
    OLLAMA_BASE = args.ollama_url

    log("Starting GH0ST_B0Y Node Agent")
    log(f"API: {API_BASE}")
    log(f"Ollama: {OLLAMA_BASE}")

    # Detect hardware
    gpu_model, vram_gb = detect_gpu()
    cpu_model = detect_cpu()
    ram_gb = detect_ram_gb()
    storage_gb = detect_storage_gb()

    log(f"CPU: {cpu_model}")
    if gpu_model:
        log(f"GPU: {gpu_model} ({vram_gb} GB VRAM)")
    else:
        log("GPU: Not detected (CPU-only inference)")
    log(f"RAM: {ram_gb} GB")
    log(f"Storage: {storage_gb} GB")

    # Start Ollama
    start_ollama()
    pull_default_model(vram_gb)

    log("Connecting to GH0ST_B0Y network...")

    # Heartbeat loop
    while True:
        send_heartbeat(args.token, gpu_model, cpu_model, vram_gb, ram_gb)
        time.sleep(HEARTBEAT_INTERVAL)


if __name__ == "__main__":
    main()
