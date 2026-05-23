#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# ViRtUaL_B0Y Genesis Chain + IPFS + Resource Sharing Entrypoint
# ═══════════════════════════════════════════════════════════════════════════
# Starts IPFS daemon, chain monitor, and resource sharing services
# In Memory of GHOST - April 7, 2025
# ═══════════════════════════════════════════════════════════════════════════

set -e

CHAIN_TYPE="${CHAIN_TYPE:-cpu}"
ENABLE_RESOURCE_SHARING="${ENABLE_RESOURCE_SHARING:-true}"
ADVERTISE_INTERVAL="${ADVERTISE_INTERVAL:-30}"

echo "
╔═══════════════════════════════════════════════════════════════════════════╗
║     ViRtUaL_B0Y X25X Genesis Chain + IPFS + Resource Sharing              ║
║     Chain: ${CHAIN_TYPE^^}                                                ║
║     In Memory of GHOST - April 7, 2025                                    ║
╚═══════════════════════════════════════════════════════════════════════════╝
"

# ═══════════════════════════════════════════════════════════════════════════
# IPFS SETUP
# ═══════════════════════════════════════════════════════════════════════════

if [ ! -f "$IPFS_PATH/config" ]; then
    echo "[IPFS] Initializing IPFS node..."
    ipfs init --profile=server

    # Configure IPFS for container environment
    ipfs config Addresses.API /ip4/0.0.0.0/tcp/5001
    ipfs config Addresses.Gateway /ip4/0.0.0.0/tcp/8080

    # Enable pubsub for resource discovery
    ipfs config --json Pubsub.Enabled true
    ipfs config Pubsub.Router gossipsub

    # CORS for API access
    ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
    ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["GET", "POST", "PUT"]'

    # Swarm configuration for better connectivity
    ipfs config --json Swarm.ConnMgr.LowWater 50
    ipfs config --json Swarm.ConnMgr.HighWater 200

    echo "[IPFS] IPFS initialized with pubsub enabled"
else
    echo "[IPFS] Using existing IPFS repository"

    # Ensure pubsub is enabled on existing repos
    ipfs config --json Pubsub.Enabled true 2>/dev/null || true
fi

# Get IPFS peer ID
PEER_ID=$(ipfs config Identity.PeerID)
echo "[IPFS] Peer ID: $PEER_ID"

# Start IPFS daemon with pubsub
echo "[IPFS] Starting IPFS daemon with pubsub..."
ipfs daemon --enable-pubsub-experiment --enable-gc &
IPFS_PID=$!

# Wait for IPFS to start
echo "[IPFS] Waiting for IPFS daemon..."
for i in {1..30}; do
    if ipfs id > /dev/null 2>&1; then
        echo "[IPFS] IPFS daemon running"
        break
    fi
    sleep 1
done

if ! ipfs id > /dev/null 2>&1; then
    echo "[IPFS] WARNING: IPFS daemon may not be fully started"
fi

# ═══════════════════════════════════════════════════════════════════════════
# RESOURCE SHARING SETUP
# ═══════════════════════════════════════════════════════════════════════════

if [ "$ENABLE_RESOURCE_SHARING" = "true" ]; then
    echo "[RESOURCE] Starting resource advertiser for ${CHAIN_TYPE}..."

    # Install psutil if not present (for resource monitoring)
    pip install psutil --quiet 2>/dev/null || true

    # Start resource advertiser in background
    export GENESIS_HOME=/data
    export ADVERTISE_INTERVAL=$ADVERTISE_INTERVAL
    python3 /app/genesis/network/resource_advertiser.py "$CHAIN_TYPE" "$ADVERTISE_INTERVAL" &
    ADVERTISER_PID=$!
    echo "[RESOURCE] Advertiser started (PID: $ADVERTISER_PID)"

    # Start peer discovery in background (only on cpu chain to avoid duplicates)
    if [ "$CHAIN_TYPE" = "cpu" ]; then
        echo "[RESOURCE] Starting peer discovery service..."
        python3 /app/genesis/network/peer_discovery.py --all-chains &
        DISCOVERY_PID=$!
        echo "[RESOURCE] Discovery started (PID: $DISCOVERY_PID)"
    fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# CHAIN MONITOR
# ═══════════════════════════════════════════════════════════════════════════

echo "[CHAIN] Starting X25X chain monitor for ${CHAIN_TYPE}..."
echo ""

# Run chain monitor (this will be the foreground process)
exec python3 /app/genesis/scripts/chain_monitor.py "$CHAIN_TYPE"
