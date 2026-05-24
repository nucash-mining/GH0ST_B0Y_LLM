#!/bin/bash
# GH0ST_B0Y Node Agent Installer
# Usage: curl -fsSL https://ghost-boy-llm.vercel.app/install.sh | bash -s -- --token YOUR_TOKEN

set -e

TOKEN=""
for arg in "$@"; do
  case $arg in
    --token=*) TOKEN="${arg#*=}" ;;
    --token)   shift; TOKEN="$1" ;;
  esac
done

echo ""
echo "  ██████╗ ██╗  ██╗ ██████╗ ███████╗████████╗    ██████╗  ██████╗ ██╗   ██╗"
echo "  ██╔════╝ ██║  ██║██╔═══██╗██╔════╝╚══██╔══╝    ██╔══██╗██╔═══██╗╚██╗ ██╔╝"
echo "  ██║  ███╗███████║██║   ██║███████╗   ██║       ██████╔╝██║   ██║ ╚████╔╝ "
echo "  ██║   ██║██╔══██║██║   ██║╚════██║   ██║       ██╔══██╗██║   ██║  ╚██╔╝  "
echo "  ╚██████╔╝██║  ██║╚██████╔╝███████║   ██║       ██████╔╝╚██████╔╝   ██║   "
echo "   ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝       ╚═════╝  ╚═════╝    ╚═╝   "
echo ""
echo "  EV-LLM Node Agent Installer"
echo ""

# Check Python
if ! command -v python3 &>/dev/null; then
  echo "[-] Python 3 is required. Install it from https://python.org"
  exit 1
fi

INSTALL_DIR="$HOME/.ghostboy"
mkdir -p "$INSTALL_DIR"

echo "[+] Downloading agent..."
curl -fsSL "https://ghost-boy-llm.vercel.app/ghostboy-agent.py" -o "$INSTALL_DIR/ghostboy-agent.py"
chmod +x "$INSTALL_DIR/ghostboy-agent.py"

echo "[+] Installing Python dependencies..."
python3 -m pip install rich --quiet

if [ -z "$TOKEN" ]; then
  echo ""
  echo "[?] Enter your agent token from ghost-boy-llm.vercel.app/contribute:"
  read -r TOKEN
fi

# Create launcher script
cat > "$INSTALL_DIR/start.sh" << EOF
#!/bin/bash
python3 "$INSTALL_DIR/ghostboy-agent.py" --token "$TOKEN"
EOF
chmod +x "$INSTALL_DIR/start.sh"

# Create systemd service (Linux only)
if command -v systemctl &>/dev/null; then
  SERVICE_FILE="/etc/systemd/system/ghostboy.service"
  echo "[+] Creating systemd service (requires sudo)..."
  sudo tee "$SERVICE_FILE" > /dev/null << EOF
[Unit]
Description=GH0ST_B0Y Node Agent
After=network.target

[Service]
ExecStart=python3 $INSTALL_DIR/ghostboy-agent.py --token $TOKEN
Restart=always
RestartSec=10
User=$USER

[Install]
WantedBy=multi-user.target
EOF
  sudo systemctl daemon-reload
  echo ""
  echo "[+] To run as a background service:"
  echo "    sudo systemctl enable ghostboy"
  echo "    sudo systemctl start ghostboy"
fi

echo ""
echo "[✓] GH0ST_B0Y Node Agent installed at $INSTALL_DIR"
echo ""
echo "  Run now:   bash $INSTALL_DIR/start.sh"
echo "  Or:        python3 $INSTALL_DIR/ghostboy-agent.py --token $TOKEN"
echo ""
