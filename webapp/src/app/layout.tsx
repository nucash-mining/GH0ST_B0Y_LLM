import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Header } from '@/components/layout/Header';

export const metadata: Metadata = {
  title: 'GH0ST_B0Y Oracle | Decentralized LLM',
  description: 'EV-LLM Oracle — 7-chain decentralized AI. In memory of GHOST, April 7, 2025.',
  icons: { icon: '/ghost-icon.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="scan-overlay bg-ghost-black min-h-screen">
        <Providers>
          <Header />
          <main className="pt-16">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
