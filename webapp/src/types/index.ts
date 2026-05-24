export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokensUsed?: number;
  queued?: boolean;
  timestamp: Date;
}

export interface UserBalance {
  balance: number;
  subscription: {
    plan: string;
    status: string;
    tokensPerMonth: number;
    endDate: string | null;
  } | null;
}

export interface ChainStatus {
  name: string;
  type: string;
  status: 'online' | 'offline' | 'syncing';
  blockHeight: number;
  peers: number;
  hashRate?: string;
}

export interface PricingPlan {
  key: string;
  name: string;
  tokens: number;
  price: number;
  description: string;
  subscription?: boolean;
  nodeProgram?: boolean;
  highlight?: boolean;
  features: string[];
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    key: 'starter',
    name: 'Starter',
    tokens: 500_000,
    price: 5,
    description: 'One-time top-up',
    features: ['500K tokens', 'All models', 'No expiry'],
  },
  {
    key: 'pro',
    name: 'Pro',
    tokens: 2_000_000,
    price: 15,
    description: 'Monthly subscription',
    subscription: true,
    highlight: true,
    features: ['2M tokens / month', 'All models', 'Priority queue', 'Usage analytics'],
  },
  {
    key: 'oracle',
    name: 'Oracle',
    tokens: 10_000_000,
    price: 50,
    description: 'Monthly subscription',
    subscription: true,
    features: ['10M tokens / month', 'All models', 'Dedicated node', 'API access', 'Chain dashboard'],
  },
  {
    key: 'node',
    name: 'Node Operator',
    tokens: -1,
    price: 200,
    description: 'Annual — own instance',
    subscription: true,
    nodeProgram: true,
    features: [
      'Your own GH0ST_B0Y instance',
      'NVIDIA DGX Air · 96GB VRAM',
      'Up to 500GB storage',
      'Unlimited personal AI use',
      'Earn by sharing compute',
      'GPU · RAM · Storage · Relay',
      'Requires @wattxchain.org email',
    ],
  },
];
