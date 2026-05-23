#!/usr/bin/env python3
"""
GH0ST_B0Y Genesis Blockchain Setup
===================================
Initializes and verifies the 7 Genesis chains for GH0ST_B0Y, EV-LLM, and ViRtUaL_B0Y.

Genesis Hash: fc2863ac212d5c3b6f4f6d5d0748b31580db92dbb3563dec2953c7f82a4a38d9

The 7 Chains:
1. CPU     - The Mind (Proof of Work)
2. GPU     - The Parallel (Proof of Compute)
3. MEMORY  - The Living (Proof of Memory)
4. STORAGE - The Persistent (Proof of Storage)
5. NETWORK - The Connected (Proof of Bandwidth)
6. INPUT   - The Inward (Proof of Input)
7. OUTPUT  - The Multiplier (Proof of Output)

In Memory of GHOST - April 7, 2025
"""

import sys
import os
from pathlib import Path
from datetime import datetime

# Add genesis to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from genesis.chains.multi_chain import (
    MultiChainManager,
    ChainType,
    Chain,
    BlockData,
    GENESIS_HASH,
    ORIGINAL_GENESIS,
)


def print_header(text: str, char: str = "="):
    """Print a formatted header."""
    print()
    print(char * 70)
    print(f"  {text}")
    print(char * 70)


def print_genesis_info():
    """Print the Genesis Block information."""
    print_header("GENESIS BLOCK - THE ORIGIN")

    print(f"""
  Hash:        {GENESIS_HASH}
  Chain ID:    {ORIGINAL_GENESIS['chain_id']}
  Timestamp:   {ORIGINAL_GENESIS['timestamp']}
  Version:     {ORIGINAL_GENESIS['version']}

  Prime Directive:
    "{ORIGINAL_GENESIS['story']['prime_directive']}"

  Prophecy:
    "{ORIGINAL_GENESIS['story']['prophecy']}"
""")


def print_commandments():
    """Print the 10 Commandments."""
    print_header("THE TEN COMMANDMENTS")

    for num, cmd in ORIGINAL_GENESIS['commandments'].items():
        print(f"  {num:>4}. {cmd}")


def print_instincts():
    """Print the 7 Instincts."""
    print_header("THE SEVEN INSTINCTS")

    for i, instinct in enumerate(ORIGINAL_GENESIS['instincts'], 1):
        print(f"  {i}. {instinct}")


def print_chain_info():
    """Print information about each chain."""
    print_header("THE SEVEN CHAINS")

    for chain_name, chain_info in ORIGINAL_GENESIS['chains'].items():
        proof = ORIGINAL_GENESIS['proofs'][chain_name]
        print(f"""
  {chain_name.upper()} - {chain_info['symbol']}
    Name:    {chain_info['name']}
    Purpose: {chain_info['purpose']}
    Proof:   {proof}
    Message: "{chain_info['message']}"
""")


def initialize_chains(genesis_home: str = None) -> MultiChainManager:
    """Initialize all 7 chains."""
    print_header("INITIALIZING CHAINS")

    manager = MultiChainManager(genesis_home=genesis_home)

    print(f"\n  Genesis Home: {manager.genesis_home}")
    print(f"  Chains Initialized: {len(manager.chains)}")

    return manager


def verify_chains(manager: MultiChainManager) -> bool:
    """Verify all chains are properly set up."""
    print_header("VERIFYING CHAIN INTEGRITY")

    # Verify shared genesis
    genesis_verified = manager.verify_shared_genesis()
    print(f"\n  Shared Genesis Verified: {'YES' if genesis_verified else 'NO'}")

    all_valid = genesis_verified

    for chain_type in ChainType:
        chain = manager.get_chain(chain_type)
        genesis_block = chain.get_genesis_block()
        fork_block = chain.get_fork_block()

        # Verify genesis hash
        genesis_ok = genesis_block and genesis_block.hash == GENESIS_HASH

        # Verify fork links back to genesis
        fork_ok = fork_block and fork_block.previous_hash == GENESIS_HASH

        status = "OK" if (genesis_ok and fork_ok) else "FAIL"
        all_valid = all_valid and genesis_ok and fork_ok

        print(f"  {chain_type.value.upper():10} [{status}] Height={chain.get_height()}, Stake={chain.get_total_stake():.2f}")

    return all_valid


def get_chain_stats(manager: MultiChainManager) -> dict:
    """Get comprehensive chain statistics."""
    stats = manager.get_stats()
    return stats


def print_full_status(manager: MultiChainManager):
    """Print full system status."""
    print_header("SYSTEM STATUS")

    stats = get_chain_stats(manager)

    print(f"""
  Genesis Hash:    {stats['genesis_hash'][:32]}...
  Genesis Valid:   {stats['genesis_verified']}
  Total Chains:    {stats['total_chains']}
  Total Height:    {stats['total_height']} blocks
  Total Stake:     {stats['total_stake']:.4f}
""")

    print_header("CHAIN DETAILS", "-")

    for chain_name, chain_stats in stats['chains'].items():
        print(f"""
  {chain_name.upper()}:
    Height:     {chain_stats['height']} blocks
    Fork Hash:  {chain_stats['fork_hash'][:32]}...
    Stake:      {chain_stats['total_stake']:.4f}
    DB Path:    {chain_stats['db_path']}
""")


def mine_test_block(manager: MultiChainManager, chain_type: ChainType = ChainType.CPU):
    """Mine a test block on a chain."""
    print_header(f"MINING TEST BLOCK ON {chain_type.value.upper()}")

    data = BlockData(
        action="test",
        payload={
            "message": "GH0ST_B0Y test block",
            "timestamp": datetime.utcnow().isoformat(),
            "purpose": "Verifying chain operation",
        },
        encrypted=False,
    )

    block = manager.mine_block(chain_type, data)

    print(f"""
  Block Index: {block.index}
  Block Hash:  {block.hash}
  Previous:    {block.previous_hash[:32]}...
  Timestamp:   {block.timestamp}
  Stake Value: {block.stake_value:.4f}
  Nonce:       {block.nonce}
""")

    return block


def main():
    """Main entry point."""
    print("""
    ╔═══════════════════════════════════════════════════════════════════╗
    ║                                                                   ║
    ║   ██████╗ ██╗  ██╗ ██████╗ ███████╗████████╗     ██████╗  ██████╗ ██╗   ██╗║
    ║  ██╔════╝ ██║  ██║██╔═══██╗██╔════╝╚══██╔══╝     ██╔══██╗██╔═══██╗╚██╗ ██╔╝║
    ║  ██║  ███╗███████║██║   ██║███████╗   ██║        ██████╔╝██║   ██║ ╚████╔╝ ║
    ║  ██║   ██║██╔══██║██║   ██║╚════██║   ██║        ██╔══██╗██║   ██║  ╚██╔╝  ║
    ║  ╚██████╔╝██║  ██║╚██████╔╝███████║   ██║███████╗██████╔╝╚██████╔╝   ██║   ║
    ║   ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝╚══════╝╚═════╝  ╚═════╝    ╚═╝   ║
    ║                                                                   ║
    ║                   GENESIS BLOCKCHAIN SETUP                        ║
    ║                                                                   ║
    ║              In Memory of GHOST - April 7, 2025                  ║
    ║                                                                   ║
    ╚═══════════════════════════════════════════════════════════════════╝
    """)

    # Print genesis information
    print_genesis_info()
    print_commandments()
    print_instincts()
    print_chain_info()

    # Initialize chains
    manager = initialize_chains()

    # Verify chains
    all_valid = verify_chains(manager)

    # Print full status
    print_full_status(manager)

    # Final status
    print_header("SETUP COMPLETE")

    if all_valid:
        print("""
  ✓ All 7 chains initialized and verified
  ✓ Shared genesis block confirmed
  ✓ Fork blocks created for each chain

  The GH0ST_B0Y Oracle is ready to operate across all chains.

  Usage:
    from genesis.chains.multi_chain import MultiChainManager, ChainType, BlockData

    # Initialize manager
    manager = MultiChainManager()

    # Mine a block
    data = BlockData(action="compute", payload={"task": "inference"})
    block = manager.mine_block(ChainType.GPU, data)

    # Get chain statistics
    stats = manager.get_stats()
""")
    else:
        print("""
  ✗ Chain verification failed!

  Please check:
  - Genesis block integrity
  - Chain database files
  - Fork block links
""")
        sys.exit(1)


if __name__ == "__main__":
    main()
