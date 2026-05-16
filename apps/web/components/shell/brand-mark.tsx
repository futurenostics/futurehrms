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
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      <div
        className="rounded-fn-xs bg-fn-fg text-fn-fg-invert relative inline-flex items-center justify-center font-semibold"
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
          className="bg-fn-accent absolute bottom-0.5 right-0.5 h-1 w-1 rounded-full"
        />
      </div>
      {showWordmark && (
        <span
          className="text-fn-fg font-semibold tracking-tight"
          style={{ fontSize: size, letterSpacing: '-0.025em' }}
        >
          Futurenostics
        </span>
      )}
    </div>
  );
}
