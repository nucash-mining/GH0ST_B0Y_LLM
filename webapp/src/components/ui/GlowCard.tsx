'use client';
import { cn } from '@/lib/utils';

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: 'cyan' | 'purple' | 'green' | 'red';
  hover?: boolean;
}

export function GlowCard({ children, className, glow = 'cyan', hover = false }: GlowCardProps) {
  const glowColors = {
    cyan: 'border-ghost-cyan/20 hover:border-ghost-cyan/50 hover:shadow-[0_0_30px_rgba(0,245,255,0.15)]',
    purple: 'border-ghost-purple/20 hover:border-ghost-purple/50 hover:shadow-[0_0_30px_rgba(123,47,255,0.15)]',
    green: 'border-ghost-green/20 hover:border-ghost-green/50 hover:shadow-[0_0_30px_rgba(0,255,136,0.15)]',
    red: 'border-ghost-red/20 hover:border-ghost-red/50 hover:shadow-[0_0_30px_rgba(255,51,102,0.15)]',
  };

  return (
    <div className={cn(
      'bg-ghost-card border rounded-xl p-6 transition-all duration-300',
      glowColors[glow],
      hover && 'cursor-pointer',
      className
    )}>
      {children}
    </div>
  );
}
