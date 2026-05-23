#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# Add Peer - Connect to a remote peer
# ═══════════════════════════════════════════════════════════════════════════

if [ -z "$1" ]; then
    echo "Usage: ./add_peer.sh <multiaddr>"
    echo ""
    echo "Example:"
    echo "  ./add_peer.sh /ip4/1.2.3.4/tcp/4001/p2p/12D3KooWxxxxxxxxxx"
    exit 1
fi

PEER_ADDR="$1"

echo "
╔═══════════════════════════════════════════════════════════════════════════╗
║                    ADD PEER TO NETWORK                                    ║
╚═══════════════════════════════════════════════════════════════════════════╝
"

echo "Connecting all chains to peer: $PEER_ADDR"
echo ""

connected=0
failed=0

for chain in cpu gpu memory storage network input output; do
    container="genesis-chain-$chain"
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        result=$(docker exec $container ipfs swarm connect "$PEER_ADDR" 2>&1)
        if echo "$result" | grep -q "success\|connect"; then
            echo "  [✓] $chain connected"
            ((connected++))
        else
            echo "  [✗] $chain failed: $result"
            ((failed++))
        fi
    fi
done

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "Connected: $connected  Failed: $failed"
