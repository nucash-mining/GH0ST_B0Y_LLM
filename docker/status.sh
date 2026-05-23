#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# ViRtUaL_B0Y - CHAIN STATUS
# ═══════════════════════════════════════════════════════════════════════════

echo "
╔═══════════════════════════════════════════════════════════════════════════╗
║                  ViRtUaL_B0Y - 7 CHAIN STATUS                             ║
╚═══════════════════════════════════════════════════════════════════════════╝
"

echo "Chain Containers:"
echo "─────────────────────────────────────────────────────────────────────────"

declare -A SYMBOLS=(
    ["cpu"]="The Mind"
    ["gpu"]="The Parallel"
    ["memory"]="The Living"
    ["storage"]="The Persistent"
    ["network"]="The Connected"
    ["input"]="The Inward"
    ["output"]="The Multiplier"
)

for chain in cpu gpu memory storage network input output; do
    container="genesis-chain-$chain"
    symbol="${SYMBOLS[$chain]}"

    status=$(docker inspect -f '{{.State.Status}}' "$container" 2>/dev/null || echo "not found")

    if [ "$status" = "running" ]; then
        uptime=$(docker inspect -f '{{.State.StartedAt}}' "$container" 2>/dev/null)
        echo "  [✓] $chain - $symbol"
        echo "      Status: $status | Started: ${uptime:0:19}"
    else
        echo "  [✗] $chain - $symbol ($status)"
    fi
done

echo ""
echo "Network:"
echo "─────────────────────────────────────────────────────────────────────────"
docker network inspect virtualboy-genesis-network --format '  Name: {{.Name}} | Driver: {{.Driver}} | Containers: {{len .Containers}}' 2>/dev/null || echo "  Network not created"

echo ""
echo "Volume:"
echo "─────────────────────────────────────────────────────────────────────────"
docker volume inspect virtualboy-genesis-data --format '  Name: {{.Name}}
  Mountpoint: {{.Mountpoint}}' 2>/dev/null || echo "  Volume not created"

echo ""
echo "Docker Resources:"
echo "─────────────────────────────────────────────────────────────────────────"
echo "  Image: $(docker images virtualboy-genesis-chain --format '{{.Repository}}:{{.Tag}} ({{.Size}})' 2>/dev/null || echo 'not built')"

echo ""
echo "Genesis Hash: fc2863ac212d5c3b6f4f6d5d0748b31580db92dbb3563dec2953c7f82a4a38d9"
