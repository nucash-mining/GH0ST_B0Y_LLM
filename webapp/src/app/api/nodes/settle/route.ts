import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPublicClient, createWalletClient, http, parseAbi, keccak256, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia, mainnet } from 'viem/chains';

/**
 * POST /api/nodes/settle
 *
 * Internal oracle endpoint — called server-side after a job completes to
 * record the job on-chain and credit the node operators.
 *
 * Body: { jobId: string, userId: string, nodeIds: string[], tokensUsed: number }
 *
 * This is NOT called by external clients — it's triggered from job completion
 * in /api/nodes/jobs/[id] when the ORACLE_PRIVATE_KEY env var is set.
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'nucash@wattxchain.org';
const REGISTRY_ADDRESS = process.env.COMPUTE_REGISTRY_ADDRESS as `0x${string}` | undefined;

const REGISTRY_ABI = parseAbi([
  'function settleJob(bytes32 jobHash, address user, address[] calldata jobNodes, uint256 tokensUsed, uint256 costWei) external',
]);

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 11155111);
const CHAIN    = CHAIN_ID === 1 ? mainnet : sepolia;

export async function POST(req: NextRequest) {
  // This endpoint is for internal server-side calls only.
  // Gate it behind the oracle secret so it can't be called from outside.
  const secret = req.headers.get('x-oracle-secret');
  if (secret !== process.env.ORACLE_SECRET) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { jobId, userId, nodeIds, tokensUsed } = await req.json();
  if (!jobId || !userId || !nodeIds?.length || !tokensUsed) {
    return Response.json({ error: 'jobId, userId, nodeIds, tokensUsed required' }, { status: 400 });
  }

  // Resolve node wallet addresses
  const nodes = await prisma.node.findMany({
    where: { id: { in: nodeIds } },
    select: { id: true, chainAddress: true, chainRegistered: true },
  });

  const chainNodes = nodes.filter(n => n.chainRegistered && n.chainAddress);
  const costWei = BigInt(Math.floor(tokensUsed * 1e9)); // 1 token = 1 gwei

  let txHash: string | undefined;

  // Only attempt on-chain settlement if we have the registry + oracle key
  if (
    REGISTRY_ADDRESS &&
    process.env.ORACLE_PRIVATE_KEY &&
    chainNodes.length > 0
  ) {
    try {
      const account = privateKeyToAccount(
        process.env.ORACLE_PRIVATE_KEY as `0x${string}`
      );

      const walletClient = createWalletClient({
        account,
        chain: CHAIN,
        transport: http(process.env.RPC_URL),
      });

      const jobHash = keccak256(toHex(jobId));

      // Get the user's on-chain address from their wallet address in DB
      const userRecord = await prisma.user.findUnique({
        where: { id: userId },
        select: { walletAddress: true },
      });

      if (userRecord?.walletAddress) {
        const nodeAddresses = chainNodes.map(n => n.chainAddress as `0x${string}`);

        txHash = await walletClient.writeContract({
          address: REGISTRY_ADDRESS,
          abi: REGISTRY_ABI,
          functionName: 'settleJob',
          args: [
            jobHash,
            userRecord.walletAddress as `0x${string}`,
            nodeAddresses,
            BigInt(tokensUsed),
            costWei,
          ],
        });
      }
    } catch (err) {
      // On-chain settlement is best-effort; DB records are the source of truth
      console.error('[settle] on-chain settlement failed:', err);
    }
  }

  return Response.json({
    ok: true,
    onChain: !!txHash,
    txHash: txHash ?? null,
    chainNodesCount: chainNodes.length,
  });
}
