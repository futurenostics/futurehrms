import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { tile: 'h-fn-7 w-fn-7 rounded-fn-xs text-[15px]', wordmark: 'text-[14px]' },
  md: { tile: 'h-fn-9 w-fn-9 rounded-fn-sm text-[18px]', wordmark: 'text-[16px]' },
  lg: { tile: 'h-fn-12 w-fn-12 rounded-fn-md text-[24px]', wordmark: 'text-[18px]' },
};

/**
 * Brand mark — gradient indigo-violet "F" tile + wordmark.
 *
 * Phase 0 placeholder; swap to a real SVG when one is provided.
 */
export function Logo({ className, size = 'md' }: LogoProps) {
  const styles = sizeMap[size];
  return (
    <div className={cn('gap-fn-2_5 inline-flex items-center', className)}>
      {/* Brand mark stays white on the accent gradient in both themes;
          fn-fg-invert would flip to dark in dark mode and disappear. */}
      <div
        className={cn(
          // eslint-disable-next-line fn-tokens/no-default-utilities
          'shadow-fn-sm font-fn-semibold relative inline-flex items-center justify-center text-white',
          styles.tile,
        )}
        style={{
          background: 'linear-gradient(135deg, var(--fn-accent) 0%, oklch(0.42 0.20 280) 100%)',
        }}
      >
        <span className="font-display tracking-fn-tight">F</span>
        <span
          className="-bottom-fn-0_5 -right-fn-0_5 h-fn-1_5 w-fn-1_5 rounded-fn-full absolute"
          style={{ background: 'oklch(0.94 0.06 175)' }}
          aria-hidden
        />
      </div>
      <span
        className={cn(
          'font-display text-fn-fg font-fn-semibold tracking-fn-tight',
          styles.wordmark,
        )}
      >
        Futurenostics
      </span>
    </div>
  );
}
