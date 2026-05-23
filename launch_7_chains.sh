#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# ViRtUaL_B0Y - 7 CHAIN MONITOR LAUNCHER
# ═══════════════════════════════════════════════════════════════════════════
# In Memory of GHOST - April 7, 2025
# Genesis Hash: fc2863ac212d5c3b6f4f6d5d0748b31580db92dbb3563dec2953c7f82a4a38d9
# ═══════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GENESIS_DIR="$(dirname "$SCRIPT_DIR")/genesis"
MONITOR_SCRIPT="$GENESIS_DIR/scripts/chain_monitor.py"

# Check if monitor script exists
if [ ! -f "$MONITOR_SCRIPT" ]; then
    echo "ERROR: Chain monitor script not found at $MONITOR_SCRIPT"
    exit 1
fi

echo "
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║      ██╗   ██╗██╗██████╗ ████████╗██╗   ██╗ █████╗ ██╗         ██████╗    ║
║      ██║   ██║██║██╔══██╗╚══██╔══╝██║   ██║██╔══██╗██║         ██╔══██╗   ║
║      ██║   ██║██║██████╔╝   ██║   ██║   ██║███████║██║         ██████╔╝   ║
║      ╚██╗ ██╔╝██║██╔══██╗   ██║   ██║   ██║██╔══██║██║         ██╔══██╗   ║
║       ╚████╔╝ ██║██║  ██║   ██║   ╚██████╔╝██║  ██║███████╗    ██████╔╝   ║
║        ╚═══╝  ╚═╝╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚══════╝    ╚═════╝    ║
║                                                                           ║
║                  7 CHAIN MONITOR - GENESIS SYSTEM                         ║
║                                                                           ║
║                 In Memory of GHOST - April 7, 2025                        ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

Launching 7 chain monitors...
"

# The 7 chains with their colors and positions
# Chain colors defined in monitor script, terminal titles set here
declare -A CHAINS=(
    ["cpu"]="The Mind"
    ["gpu"]="The Parallel"
    ["memory"]="The Living"
    ["storage"]="The Persistent"
    ["network"]="The Connected"
    ["input"]="The Inward"
    ["output"]="The Multiplier"
)

# Calculate screen positions for 7 terminals (2 rows layout)
# Row 1: CPU, GPU, MEMORY, STORAGE
# Row 2: NETWORK, INPUT, OUTPUT
SCREEN_WIDTH=$(xdpyinfo | awk '/dimensions:/ {print $2}' | cut -d'x' -f1)
SCREEN_HEIGHT=$(xdpyinfo | awk '/dimensions:/ {print $2}' | cut -d'x' -f2)
TERM_WIDTH=$((SCREEN_WIDTH / 4))
TERM_HEIGHT=$((SCREEN_HEIGHT / 2 - 50))

declare -A POSITIONS=(
    ["cpu"]="0,0"
    ["gpu"]="$TERM_WIDTH,0"
    ["memory"]="$((TERM_WIDTH * 2)),0"
    ["storage"]="$((TERM_WIDTH * 3)),0"
    ["network"]="0,$((TERM_HEIGHT + 50))"
    ["input"]="$TERM_WIDTH,$((TERM_HEIGHT + 50))"
    ["output"]="$((TERM_WIDTH * 2)),$((TERM_HEIGHT + 50))"
)

# Launch each chain monitor in its own terminal
for chain in cpu gpu memory storage network input output; do
    symbol="${CHAINS[$chain]}"
    pos="${POSITIONS[$chain]}"
    x="${pos%,*}"
    y="${pos#*,}"

    echo "  [+] Launching $chain chain monitor - $symbol"

    xfce4-terminal \
        --title="[$chain] $symbol - Genesis Chain" \
        --geometry=80x24+$x+$y \
        --command="python3 $MONITOR_SCRIPT $chain" \
        --hold &

    sleep 0.3
done

echo "
═══════════════════════════════════════════════════════════════════════════
  All 7 chain monitors launched!

  THE SEVEN CHAINS:
    [CPU]     The Mind          - Coordinates all thoughts
    [GPU]     The Parallel      - Parallel computation
    [MEMORY]  The Living        - What is remembered, lives
    [STORAGE] The Persistent    - What is stored, persists
    [NETWORK] The Connected     - Shared wisdom
    [INPUT]   The Inward        - Knowledge flows in
    [OUTPUT]  The Multiplier    - Knowledge shared multiplies

  Genesis Hash: fc2863ac212d5c3b6f4f6d5d0748b31580db92dbb3563dec2953c7f82a4a38d9
═══════════════════════════════════════════════════════════════════════════
"
