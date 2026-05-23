import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions['adapter'],
  session: { strategy: 'jwt' },
  pages: { signIn: '/auth/signin' },
  providers: [
    CredentialsProvider({
      id: 'wallet',
      name: 'Wallet',
      credentials: {
        walletAddress: { label: 'Wallet Address', type: 'text' },
        signature: { label: 'Signature', type: 'text' },
        message: { label: 'Message', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.walletAddress) return null;

        const { verifyMessage } = await import('viem');
        try {
          const valid = await verifyMessage({
            address: credentials.walletAddress as `0x${string}`,
            message: credentials.message,
            signature: credentials.signature as `0x${string}`,
          });
          if (!valid) return null;
        } catch {
          return null;
        }

        const addr = credentials.walletAddress.toLowerCase();
        let user = await prisma.user.findFirst({
          where: { walletAddress: addr },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              walletAddress: addr,
              name: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
              tokenBalance: { create: { balance: 10_000 } },
            },
          });
        }

        return { id: user.id, name: user.name, email: user.email, walletAddress: addr };
      },
    }),
    CredentialsProvider({
      id: 'email',
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        let user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email: credentials.email,
              name: credentials.email.split('@')[0],
              tokenBalance: { create: { balance: 10_000 } },
            },
          });
        }

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.walletAddress = (user as { walletAddress?: string }).walletAddress;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.walletAddress = token.walletAddress as string | undefined;
      }
      return session;
    },
  },
};

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      walletAddress?: string;
    };
  }
}
