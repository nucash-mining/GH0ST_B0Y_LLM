#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# ViRtUaL_B0Y - VIEW ALL CHAIN LOGS
# ═══════════════════════════════════════════════════════════════════════════

# Check if a specific chain was requested
if [ -n "$1" ]; then
    echo "Viewing logs for chain: $1"
    docker logs -f "genesis-chain-$1"
else
    echo "
╔═══════════════════════════════════════════════════════════════════════════╗
║              ViRtUaL_B0Y - 7 CHAIN LIVE LOGS                              ║
╚═══════════════════════════════════════════════════════════════════════════╝
"
    echo "Viewing logs for all 7 chains (Ctrl+C to exit)..."
    echo "Tip: Use './logs.sh cpu' to view single chain"
    echo ""

    # Use docker logs with timestamps for all containers
    for chain in cpu gpu memory storage network input output; do
        echo "━━━ $chain ━━━"
        docker logs --tail=5 "genesis-chain-$chain" 2>/dev/null | head -10
        echo ""
    done

    echo "Following all containers (Ctrl+C to exit)..."
    echo ""

    # Follow all containers - show which chain each log is from
    docker logs -f genesis-chain-cpu 2>&1 | sed "s/^/[CPU] /" &
    docker logs -f genesis-chain-gpu 2>&1 | sed "s/^/[GPU] /" &
    docker logs -f genesis-chain-memory 2>&1 | sed "s/^/[MEM] /" &
    docker logs -f genesis-chain-storage 2>&1 | sed "s/^/[STO] /" &
    docker logs -f genesis-chain-network 2>&1 | sed "s/^/[NET] /" &
    docker logs -f genesis-chain-input 2>&1 | sed "s/^/[INP] /" &
    docker logs -f genesis-chain-output 2>&1 | sed "s/^/[OUT] /" &

    wait
fi
