#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# Share Your Node - Export bootstrap info for others to connect
# ═══════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "
╔═══════════════════════════════════════════════════════════════════════════╗
║                    SHARE YOUR NODE                                        ║
║                                                                           ║
║  Share these addresses with others so they can connect to your node       ║
╚═══════════════════════════════════════════════════════════════════════════╝
"

echo "Your node addresses (share these with peers):"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

# Get addresses from each chain container
for chain in cpu gpu memory storage network input output; do
    container="genesis-chain-$chain"
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        peer_id=$(docker exec $container ipfs id -f '<id>' 2>/dev/null)
        if [ -n "$peer_id" ]; then
            echo "[$chain] Peer ID: $peer_id"

            # Get public addresses
            addrs=$(docker exec $container ipfs id -f '<addrs>' 2>/dev/null | grep -v "127.0.0.1" | grep -v "::1" | head -3)
            if [ -n "$addrs" ]; then
                while IFS= read -r addr; do
                    if [ -n "$addr" ]; then
                        echo "  $addr/p2p/$peer_id"
                    fi
                done <<< "$addrs"
            fi
            echo ""
        fi
    fi
done

echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo "To add a peer to your network, use:"
echo "  ./add_peer.sh <multiaddr>"
echo ""
echo "Example:"
echo "  ./add_peer.sh /ip4/1.2.3.4/tcp/4001/p2p/12D3KooW..."
