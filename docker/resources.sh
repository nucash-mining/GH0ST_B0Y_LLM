#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# Show Resource Advertisements
# ═══════════════════════════════════════════════════════════════════════════

echo "
╔═══════════════════════════════════════════════════════════════════════════╗
║                    RESOURCE ADVERTISEMENTS                                ║
╚═══════════════════════════════════════════════════════════════════════════╝
"

# Subscribe to discovery topic briefly to see recent messages
echo "Listening for resource advertisements (10 seconds)..."
echo ""

timeout 10s docker exec genesis-chain-cpu ipfs pubsub sub virtualboy/discovery 2>/dev/null | while read -t 1 line; do
    if [ -n "$line" ]; then
        # Parse JSON and display nicely
        echo "$line" | python3 -c "
import sys, json
try:
    ad = json.loads(sys.stdin.read())
    print(f\"  [{ad.get('chain_type', '?').upper()}] {ad.get('hostname', 'unknown')}\")
    print(f\"      Capacity: {ad.get('capacity', 0):.1%}\")
    print(f\"      Available: {ad.get('available', False)}\")
    print(f\"      Peer: {ad.get('peer_id', '?')[:20]}...\")
    print()
except:
    pass
" 2>/dev/null
    fi
done

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo "Pubsub Topics:"
echo "  virtualboy/discovery           - General peer discovery"
echo "  virtualboy/resources/cpu       - CPU resources"
echo "  virtualboy/resources/gpu       - GPU resources"
echo "  virtualboy/resources/memory    - Memory resources"
echo "  virtualboy/resources/storage   - Storage resources"
echo "  virtualboy/resources/network   - Network resources"
echo "  virtualboy/resources/input     - Input resources"
echo "  virtualboy/resources/output    - Output resources"
