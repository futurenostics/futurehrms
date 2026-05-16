import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { tile: 'h-7 w-7 rounded-fn-xs text-[15px]', wordmark: 'text-[14px]' },
  md: { tile: 'h-9 w-9 rounded-fn-sm text-[18px]', wordmark: 'text-[16px]' },
  lg: { tile: 'h-12 w-12 rounded-fn-md text-[24px]', wordmark: 'text-[18px]' },
};

/**
 * Brand mark — gradient indigo-violet "F" tile + wordmark.
 *
 * Phase 0 placeholder; swap to a real SVG when one is provided.
 */
export function Logo({ className, size = 'md' }: LogoProps) {
  const styles = sizeMap[size];
  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      <div
        className={cn(
          'shadow-fn-sm relative inline-flex items-center justify-center font-semibold text-white',
          styles.tile,
        )}
        style={{
          background: 'linear-gradient(135deg, var(--fn-accent) 0%, oklch(0.42 0.20 280) 100%)',
        }}
      >
        <span className="font-display tracking-tight">F</span>
        <span
          className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full"
          style={{ background: 'oklch(0.94 0.06 175)' }}
          aria-hidden
        />
      </div>
      <span className={cn('font-display text-fn-fg font-semibold tracking-tight', styles.wordmark)}>
        Futurenostics
      </span>
    </div>
  );
}
