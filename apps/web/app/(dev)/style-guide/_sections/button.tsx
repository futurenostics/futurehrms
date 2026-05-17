/**
 * Style-guide section — Button primitive.
 *
 * Reference: docs/design/shared/primitives.jsx Button (L60-90):
 *   8 variants × 3 sizes + icon size; weight 500, tracking -0.005em,
 *   1px universal border (transparent on ghost/soft/link).
 *
 * Verification: open `Commission Rules` editor + the Login form's
 * Submit button + the Employees list's New-employee primary +
 * Import wizard's Continue secondary all use this primitive — each
 * should look identical to the design when rendered alongside.
 */
import { ArrowRight, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Spec } from './label';

const VARIANTS = [
  { key: 'default', label: 'Primary' },
  { key: 'secondary', label: 'Secondary' },
  { key: 'outline', label: 'Outline' },
  { key: 'ghost', label: 'Ghost' },
  { key: 'soft', label: 'Soft' },
  { key: 'dark', label: 'Dark' },
  { key: 'destructive', label: 'Destructive' },
  { key: 'success', label: 'Success' },
  { key: 'link', label: 'Link' },
] as const;

const SIZES = ['sm', 'md', 'lg'] as const;

export function ButtonSection() {
  return (
    <div id="primitive-button" className="gap-fn-3 scroll-mt-fn-7 flex flex-col">
      <div className="gap-fn-1 flex flex-col">
        <h3 className="text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight">
          Button
        </h3>
        <p className="text-fn-fg-muted text-fn-base-plus leading-fn-normal max-w-[640px]">
          9 variants × 3 sizes (+ a square icon variant). Heights are 28 / 34 / 40 px to match the
          design's button-stack rhythm in form footers and toolbars. Every variant carries a 1px
          border (transparent where invisible) so the rendered height is identical across the row.
        </p>
      </div>

      {/* Variant × size matrix */}
      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs gap-fn-4 p-fn-6 flex flex-col border">
        {VARIANTS.map((v) => (
          <div key={v.key} className="gap-fn-3 grid grid-cols-[120px_1fr] items-center">
            <code className="text-fn-fg-muted text-fn-sm-plus font-mono">{v.label}</code>
            <div className="gap-fn-3 flex flex-wrap items-center">
              {SIZES.map((s) => (
                <Button key={s} variant={v.key} size={s}>
                  {v.label} {s}
                </Button>
              ))}
              <Button variant={v.key} size="md">
                <Plus /> Add
              </Button>
              <Button variant={v.key} size="md">
                Continue <ArrowRight />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Icon size + loading states */}
      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs gap-fn-4 p-fn-6 flex flex-col border">
        <div className="text-fn-fg-faint text-fn-sm font-fn-semibold tracking-fn-uppercase uppercase">
          States
        </div>
        <div className="gap-fn-3 flex flex-wrap items-center">
          <Button>Idle</Button>
          <Button disabled>Disabled</Button>
          <Button>
            <Spinner size="sm" /> Loading…
          </Button>
          <Button variant="destructive">
            <Trash2 /> Delete
          </Button>
        </div>
        <div className="gap-fn-3 flex flex-wrap items-center">
          <Button size="icon" aria-label="Add">
            <Plus />
          </Button>
          <Button size="icon" variant="outline" aria-label="Add">
            <Plus />
          </Button>
          <Button size="icon" variant="ghost" aria-label="Add">
            <Plus />
          </Button>
        </div>
      </div>

      <Spec
        items={[
          ['sizes', 'sm 28h · md 34h · lg 40h · icon 34×34'],
          ['padding-x', 'sm 10 · md 12 · lg 16'],
          ['font-size', 'sm 12.5 · md 13 · lg 14'],
          ['font-weight', '500 (font-fn-medium)'],
          ['tracking', '-0.005em (tracking-fn-micro-loose)'],
          ['radius', 'sm/md rounded-fn-xs (6) · lg rounded-fn-sm (8)'],
          ['icon size', 'sm 14 · md 15 · lg 16'],
          ['gap', 'sm 6 · md 7 · lg 8'],
          ['border', '1px universal (transparent on ghost/soft/link)'],
          ['focus ring', '2px ring-fn-accent with 2px offset against fn-bg'],
          ['transition', 'colors 150ms'],
          [
            'variants',
            '9: default · secondary · outline · ghost · soft · dark · destructive · success · link',
          ],
        ]}
      />
    </div>
  );
}
