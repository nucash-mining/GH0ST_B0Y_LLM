#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# ViRtUaL_B0Y - REMOVE 7 CHAIN CONTAINERS
# ═══════════════════════════════════════════════════════════════════════════

echo "Removing 7 chain containers..."

for chain in cpu gpu memory storage network input output; do
    container_name="genesis-chain-$chain"
    docker rm -f $container_name 2>/dev/null && echo "  [✓] Removed $chain" || echo "  [-] $chain not found"
done

echo ""
echo "All chain containers removed."
echo ""
read -p "Remove network and volume? (y/N): " confirm
if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
    docker network rm virtualboy-genesis-network 2>/dev/null
    docker volume rm virtualboy-genesis-data 2>/dev/null
    echo "Network and volume removed."
fi
