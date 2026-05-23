#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# Peer all 7 IPFS nodes together
# ═══════════════════════════════════════════════════════════════════════════

echo "Peering all 7 IPFS nodes together..."

# Get peer IDs from each container
declare -A PEER_IDS
for chain in cpu gpu memory storage network input output; do
    PEER_IDS[$chain]=$(docker exec genesis-chain-$chain ipfs id -f '<id>' 2>/dev/null)
    echo "[$chain] Peer ID: ${PEER_IDS[$chain]}"
done

# Connect each node to all others via Docker network
echo ""
echo "Connecting peers..."

for chain1 in cpu gpu memory storage network input output; do
    for chain2 in cpu gpu memory storage network input output; do
        if [ "$chain1" != "$chain2" ]; then
            peer_id="${PEER_IDS[$chain2]}"
            # Connect via container name on Docker network
            docker exec genesis-chain-$chain1 ipfs swarm connect "/dns4/genesis-chain-$chain2/tcp/4001/p2p/$peer_id" 2>/dev/null
        fi
    done
    echo "  [$chain1] Connected to peers"
done

echo ""
echo "Verifying connections..."
for chain in cpu gpu memory storage network input output; do
    peer_count=$(docker exec genesis-chain-$chain ipfs swarm peers 2>/dev/null | wc -l)
    echo "  [$chain] Connected to $peer_count peers"
done

echo ""
echo "IPFS peering complete!"
