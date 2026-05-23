import { createPublicClient, http, parseEther, formatEther } from 'viem';
import { sepolia, mainnet } from 'viem/chains';

export const PAYMENT_RECEIVER = process.env.PAYMENT_RECEIVER_ADDRESS as `0x${string}`;
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 11155111);
export const CHAIN = CHAIN_ID === 1 ? mainnet : sepolia;

export const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(),
});

export async function verifyEthPayment(txHash: `0x${string}`): Promise<{
  valid: boolean;
  valueEth: string;
  from: string;
}> {
  const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  const tx = await publicClient.getTransaction({ hash: txHash });

  const valid =
    receipt.status === 'success' &&
    tx.to?.toLowerCase() === PAYMENT_RECEIVER.toLowerCase();

  return {
    valid,
    valueEth: formatEther(tx.value),
    from: tx.from,
  };
}

export function ethToTokens(ethAmount: string): number {
  const ethPriceUsd = Number(process.env.ETH_PRICE_USD ?? 3000);
  const tokensPerUsd = Number(process.env.TOKENS_PER_USD ?? 100_000);
  const usdValue = parseFloat(ethAmount) * ethPriceUsd;
  return Math.floor(usdValue * tokensPerUsd);
}

export { parseEther, formatEther };
