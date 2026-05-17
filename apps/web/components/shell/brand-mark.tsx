import { cn } from '@/lib/utils';

/**
 * Sidebar variant of the brand — dark tile, accent dot. Matches
 * docs/design/shared/chrome.jsx. The login page uses a different
 * gradient variant from `components/brand/logo.tsx`.
 */
export function BrandMark({
  size = 18,
  showWordmark = true,
  className,
}: {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('gap-fn-2_5 inline-flex items-center', className)}>
      <div
        className="rounded-fn-xs bg-fn-fg text-fn-fg-invert font-fn-semibold relative inline-flex items-center justify-center"
        style={{
          width: size + 6,
          height: size + 6,
          fontSize: size * 0.62,
          fontFamily: 'var(--fn-font-display)',
          letterSpacing: '-0.05em',
        }}
      >
        <span className="-translate-y-px">F</span>
        <span
          aria-hidden
          className="bg-fn-accent bottom-fn-0_5 right-fn-0_5 h-fn-1 w-fn-1 rounded-fn-full absolute"
        />
      </div>
      {showWordmark && (
        <span
          className="text-fn-fg font-fn-semibold tracking-fn-tight"
          style={{ fontSize: size, letterSpacing: '-0.025em' }}
        >
          Futurenostics
        </span>
      )}
    </div>
  );
}
