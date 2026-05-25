import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPublicClient, http, parseAbi } from 'viem';
import { sepolia, mainnet } from 'viem/chains';

/**
 * POST /api/nodes/chain-register
 *
 * Called by the agent after the user has submitted the registerNode() tx.
 * Verifies the tx on-chain and marks the node as chainRegistered in the DB.
 *
 * Body: { txHash: string, walletAddress: string, fingerprint: string }
 */

const REGISTRY_ADDRESS = process.env.COMPUTE_REGISTRY_ADDRESS as `0x${string}` | undefined;
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 11155111);
const CHAIN    = CHAIN_ID === 1 ? mainnet : sepolia;

const REGISTRY_ABI = parseAbi([
  'event NodeRegistered(address indexed operator, bytes32 fingerprint, uint256 vramGb, uint256 stake)',
]);

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')?.replace('Bearer ', '').trim();
  if (!auth) return Response.json({ error: 'Missing token' }, { status: 401 });

  const node = await prisma.node.findUnique({ where: { id: auth } })
    ?? await prisma.node.findUnique({ where: { agentToken: auth } });

  if (!node) return Response.json({ error: 'Node not found' }, { status: 404 });

  const { txHash, walletAddress, fingerprint } = await req.json().catch(() => ({}));
  if (!txHash || !walletAddress) {
    return Response.json({ error: 'txHash and walletAddress required' }, { status: 400 });
  }

  // If no registry is deployed yet, just record the intent
  if (!REGISTRY_ADDRESS) {
    await prisma.node.update({
      where: { id: node.id },
      data: {
        chainAddress:        walletAddress,
        chainTxHash:         txHash,
        chainRegistered:     false, // unverified — no contract deployed
        hardwareFingerprint: fingerprint ?? node.hardwareFingerprint,
      },
    });
    return Response.json({
      ok: true,
      verified: false,
      message: 'Recorded. On-chain verification will begin once COMPUTE_REGISTRY_ADDRESS is set.',
    });
  }

  // Verify the tx actually emitted NodeRegistered for this wallet
  try {
    const client = createPublicClient({ chain: CHAIN, transport: http(process.env.RPC_URL) });
    const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });

    const verified =
      receipt.status === 'success' &&
      receipt.logs.some(log =>
        log.address.toLowerCase() === REGISTRY_ADDRESS!.toLowerCase() &&
        log.topics[1]?.toLowerCase().includes(walletAddress.toLowerCase().slice(2))
      );

    await prisma.node.update({
      where: { id: node.id },
      data: {
        chainAddress:        walletAddress,
        chainTxHash:         txHash,
        chainRegistered:     verified,
        hardwareFingerprint: fingerprint ?? node.hardwareFingerprint,
      },
    });

    return Response.json({ ok: true, verified });
  } catch (err) {
    return Response.json({
      error: 'Could not verify tx',
      detail: err instanceof Error ? err.message : String(err),
    }, { status: 502 });
  }
}

/**
 * GET /api/nodes/chain-register
 *
 * Returns the contract address and ABI snippet so the agent knows where to
 * send the registerNode() transaction.
 */
export async function GET() {
  return Response.json({
    contractAddress: REGISTRY_ADDRESS ?? null,
    chainId:         CHAIN_ID,
    minStakeWei:     '10000000000000000', // 0.01 ETH
    deployed:        !!REGISTRY_ADDRESS,
    abi: [
      'function registerNode(bytes32 fingerprint, uint256 benchmarkScore, uint256 vramGb, uint256 ramGb, string calldata ollamaUrl, string calldata agentVersion) external payable',
    ],
  });
}
