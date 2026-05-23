'use client';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-ghost-cyan text-ghost-black font-bold hover:bg-ghost-cyan/90 shadow-[0_0_20px_rgba(0,245,255,0.3)]',
    secondary: 'bg-ghost-card border border-ghost-cyan/30 text-ghost-cyan hover:border-ghost-cyan/60',
    ghost: 'bg-transparent text-ghost-text hover:text-ghost-cyan hover:bg-ghost-card',
    danger: 'bg-ghost-red/10 border border-ghost-red/30 text-ghost-red hover:bg-ghost-red/20',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-8 py-4 text-base',
  };

  return (
    <button
      className={cn(
        'rounded-lg font-mono transition-all duration-200 flex items-center gap-2',
        variants[variant],
        sizes[size],
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
