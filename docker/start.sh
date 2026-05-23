#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# ViRtUaL_B0Y - START 7 CHAIN + IPFS CONTAINERS
# ═══════════════════════════════════════════════════════════════════════════
# X25X Fork with IPFS Integration
# In Memory of GHOST - April 7, 2025
# ═══════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
IMAGE_NAME="virtualboy-genesis-ipfs"
NETWORK_NAME="virtualboy-genesis-network"
VOLUME_NAME="virtualboy-genesis-data"
IPFS_VOLUME="virtualboy-ipfs-data"

echo "
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║      ██╗   ██╗██╗██████╗ ████████╗██╗   ██╗ █████╗ ██╗         ██████╗    ║
║      ██║   ██║██║██╔══██╗╚══██╔══╝██║   ██║██╔══██╗██║         ██╔══██╗   ║
║      ██║   ██║██║██████╔╝   ██║   ██║   ██║███████║██║         ██████╔╝   ║
║      ╚██╗ ██╔╝██║██╔══██╗   ██║   ██║   ██║██╔══██║██║         ██╔══██╗   ║
║       ╚████╔╝ ██║██║  ██║   ██║   ╚██████╔╝██║  ██║███████╗    ██████╔╝   ║
║        ╚═══╝  ╚═╝╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚══════╝    ╚═════╝    ║
║                                                                           ║
║           X25X GENESIS + IPFS - 7 CHAIN DOCKER LAUNCHER                   ║
║                                                                           ║
║                 In Memory of GHOST - April 7, 2025                        ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
"

# Create network if it doesn't exist
echo "[1/5] Creating network..."
docker network inspect $NETWORK_NAME >/dev/null 2>&1 || docker network create $NETWORK_NAME

# Create volumes if they don't exist
echo "[2/5] Creating volumes..."
docker volume inspect $VOLUME_NAME >/dev/null 2>&1 || docker volume create $VOLUME_NAME
docker volume inspect $IPFS_VOLUME >/dev/null 2>&1 || docker volume create $IPFS_VOLUME

# Build the image
echo "[3/5] Building Docker image with IPFS..."
docker build -t $IMAGE_NAME -f "$SCRIPT_DIR/Dockerfile" "$PROJECT_DIR"

if [ $? -ne 0 ]; then
    echo "ERROR: Docker build failed!"
    exit 1
fi

# IPFS port mapping - each chain gets unique ports
# Base ports: 4001 (swarm), 5001 (api), 8080 (gateway)
declare -A SWARM_PORTS=(
    ["cpu"]=4001
    ["gpu"]=4002
    ["memory"]=4003
    ["storage"]=4004
    ["network"]=4005
    ["input"]=4006
    ["output"]=4007
)

declare -A API_PORTS=(
    ["cpu"]=5001
    ["gpu"]=5002
    ["memory"]=5003
    ["storage"]=5004
    ["network"]=5005
    ["input"]=5006
    ["output"]=5007
)

declare -A GATEWAY_PORTS=(
    ["cpu"]=8080
    ["gpu"]=8081
    ["memory"]=8082
    ["storage"]=8083
    ["network"]=8084
    ["input"]=8085
    ["output"]=8086
)

# Stop any existing containers
echo "[4/5] Stopping existing containers..."
for chain in cpu gpu memory storage network input output; do
    docker stop "genesis-chain-$chain" 2>/dev/null
    docker rm "genesis-chain-$chain" 2>/dev/null
done

# Start containers
echo "[5/5] Starting 7 chain + IPFS containers..."
for chain in cpu gpu memory storage network input output; do
    container_name="genesis-chain-$chain"
    swarm_port="${SWARM_PORTS[$chain]}"
    api_port="${API_PORTS[$chain]}"
    gateway_port="${GATEWAY_PORTS[$chain]}"

    docker run -d \
        --name $container_name \
        --network $NETWORK_NAME \
        --volume $VOLUME_NAME:/data/chains \
        --volume "${IPFS_VOLUME}-${chain}:/data/ipfs" \
        --env CHAIN_TYPE=$chain \
        --env GENESIS_HOME=/data \
        --env IPFS_PATH=/data/ipfs \
        -p ${swarm_port}:4001 \
        -p ${api_port}:5001 \
        -p ${gateway_port}:8080 \
        --restart unless-stopped \
        --label "genesis.chain=$chain" \
        --label "genesis.x25x=true" \
        --label "genesis.ipfs=true" \
        $IMAGE_NAME

    if [ $? -eq 0 ]; then
        echo "  [✓] Started $chain chain (IPFS API: $api_port, Gateway: $gateway_port)"
    else
        echo "  [✗] Failed to start $chain chain"
    fi
done

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "  All 7 X25X + IPFS chain containers started!"
echo ""
echo "  IPFS Ports:"
echo "    CPU:     API=5001  Gateway=8080  Swarm=4001"
echo "    GPU:     API=5002  Gateway=8081  Swarm=4002"
echo "    MEMORY:  API=5003  Gateway=8082  Swarm=4003"
echo "    STORAGE: API=5004  Gateway=8083  Swarm=4004"
echo "    NETWORK: API=5005  Gateway=8084  Swarm=4005"
echo "    INPUT:   API=5006  Gateway=8085  Swarm=4006"
echo "    OUTPUT:  API=5007  Gateway=8086  Swarm=4007"
echo ""
echo "  Commands:"
echo "    View logs:     ./logs.sh [chain]"
echo "    Status:        ./status.sh"
echo "    IPFS WebUI:    http://localhost:5001/webui (CPU chain)"
echo "    Stop all:      ./stop.sh"
echo ""
echo "  Genesis Hash: fc2863ac212d5c3b6f4f6d5d0748b31580db92dbb3563dec2953c7f82a4a38d9"
echo "  X25X Version: 1.0.0"
echo "═══════════════════════════════════════════════════════════════════════════"
