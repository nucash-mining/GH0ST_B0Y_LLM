# ═══════════════════════════════════════════════════════════════════════════
# ViRtUaL_B0Y Genesis Chain + IPFS Node
# ═══════════════════════════════════════════════════════════════════════════
# X25X Fork - 25 Algorithm Multi-Chain Proof System
# In Memory of GHOST - April 7, 2025
# Genesis Hash: fc2863ac212d5c3b6f4f6d5d0748b31580db92dbb3563dec2953c7f82a4a38d9
# ═══════════════════════════════════════════════════════════════════════════

FROM python:3.11-slim

LABEL maintainer="WATTxLLM"
LABEL description="ViRtUaL_B0Y 7-Chain Genesis + IPFS Node"
LABEL genesis.hash="fc2863ac212d5c3b6f4f6d5d0748b31580db92dbb3563dec2953c7f82a4a38d9"
LABEL x25x.version="1.0.0"

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV TERM=xterm-256color
ENV IPFS_PATH=/data/ipfs

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    ca-certificates \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages for resource monitoring
RUN pip install --no-cache-dir psutil

# Install IPFS (Kubo)
ENV IPFS_VERSION=v0.24.0
RUN wget -q https://dist.ipfs.tech/kubo/${IPFS_VERSION}/kubo_${IPFS_VERSION}_linux-amd64.tar.gz -O /tmp/ipfs.tar.gz \
    && tar -xzf /tmp/ipfs.tar.gz -C /tmp \
    && mv /tmp/kubo/ipfs /usr/local/bin/ipfs \
    && rm -rf /tmp/ipfs.tar.gz /tmp/kubo \
    && ipfs --version

# Create app directory
WORKDIR /app

# Copy genesis module
COPY genesis/ /app/genesis/

# Create data directories
RUN mkdir -p /data/chains /data/ipfs

# Set genesis home to persistent volume
ENV GENESIS_HOME=/data

# Default chain type (overridden by docker-compose)
ENV CHAIN_TYPE=cpu

# Resource sharing configuration
ENV ENABLE_RESOURCE_SHARING=true
ENV ADVERTISE_INTERVAL=30

# Expose IPFS ports
# 4001 = Swarm, 5001 = API, 8080 = Gateway
EXPOSE 4001 5001 8080

# Copy entrypoint script
COPY GH0ST_B0Y/docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD ipfs id > /dev/null 2>&1 && python3 -c "from genesis.chains.multi_chain import MultiChainManager; m = MultiChainManager('/data'); print('OK')" || exit 1

ENTRYPOINT ["/entrypoint.sh"]
