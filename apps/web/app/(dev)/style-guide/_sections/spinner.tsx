/**
 * Style-guide section — Spinner primitive.
 *
 * The design doesn't ship a dedicated Spinner — this primitive
 * formalizes the animate-spin + stroked ring pattern used ad-hoc
 * across loading states. Sizes track the icon scale (12/14/16/24/36
 * matching the spacing scale).
 */
import { Spinner } from '@/components/ui/spinner';
import { Spec } from './label';

export function SpinnerSection() {
  return (
    <div id="primitive-spinner" className="gap-fn-3 scroll-mt-fn-7 flex flex-col">
      <div className="gap-fn-1 flex flex-col">
        <h3 className="text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight">
          Spinner
        </h3>
        <p className="text-fn-fg-muted text-fn-base-plus leading-fn-normal max-w-[640px]">
          Inline loading indicator. Inherits surrounding text color via currentColor — drop one
          inside any Button, Sheet header, or panel and it picks up the right tone automatically.
        </p>
      </div>

      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs gap-fn-6 p-fn-6 flex flex-col border">
        <div className="gap-fn-6 flex flex-wrap items-end">
          {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => (
            <div key={size} className="gap-fn-1_5 flex flex-col items-center">
              <div className="text-fn-fg h-fn-12 flex items-center justify-center">
                <Spinner size={size} />
              </div>
              <code className="text-fn-fg-muted text-fn-sm font-mono">size=&quot;{size}&quot;</code>
            </div>
          ))}
        </div>

        <div className="gap-fn-4 flex flex-wrap items-center">
          <span className="text-fn-fg-muted text-fn-sm">In different colors:</span>
          <span className="text-fn-accent">
            <Spinner size="md" />
          </span>
          <span className="text-fn-success">
            <Spinner size="md" />
          </span>
          <span className="text-fn-danger">
            <Spinner size="md" />
          </span>
          <span className="text-fn-fg-faint">
            <Spinner size="md" />
          </span>
        </div>

        <div className="gap-fn-3 flex items-center">
          <Spinner size="sm" label="Loading…" />
          <span className="text-fn-fg-muted text-fn-base">Sized to sit inline with body text</span>
        </div>
      </div>

      <Spec
        items={[
          ['sizes', 'xs 12 · sm 14 · md 16 · lg 24 · xl 36 (px)'],
          ['color', 'currentColor — inherits surrounding text color'],
          ['animation', 'animate-spin · stroked ring with 1 transparent side'],
          ['radius', 'rounded-fn-full (circle)'],
          ['a11y', 'aria-hidden by default; pass label="…" for role="status" + sr-only label'],
        ]}
      />
    </div>
  );
}
