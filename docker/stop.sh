#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# ViRtUaL_B0Y - STOP 7 CHAIN CONTAINERS
# ═══════════════════════════════════════════════════════════════════════════

echo "Stopping 7 chain containers..."

for chain in cpu gpu memory storage network input output; do
    container_name="genesis-chain-$chain"
    docker stop $container_name 2>/dev/null && echo "  [✓] Stopped $chain" || echo "  [-] $chain not running"
done

echo ""
echo "All chain containers stopped."
echo ""
echo "To remove containers: ./remove.sh"
echo "To remove volume (DATA LOSS): docker volume rm virtualboy-genesis-data"
