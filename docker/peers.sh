#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# Show Connected Peers
# ═══════════════════════════════════════════════════════════════════════════

echo "
╔═══════════════════════════════════════════════════════════════════════════╗
║                    CONNECTED PEERS                                        ║
╚═══════════════════════════════════════════════════════════════════════════╝
"

total_peers=0

for chain in cpu gpu memory storage network input output; do
    container="genesis-chain-$chain"
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        peer_count=$(docker exec $container ipfs swarm peers 2>/dev/null | wc -l)
        total_peers=$((total_peers + peer_count))
        echo "[$chain] $peer_count peers connected"

        if [ "$1" = "-v" ] || [ "$1" = "--verbose" ]; then
            docker exec $container ipfs swarm peers 2>/dev/null | head -5 | while read peer; do
                echo "    $peer"
            done
        fi
    fi
done

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "Total peer connections: $total_peers"
echo ""
echo "Use -v for verbose output showing peer addresses"
