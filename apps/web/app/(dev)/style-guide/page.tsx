/**
 * /dev/style-guide — the permanent verification surface for the
 * Foundation Reset design system.
 *
 * Goal: every fn-* token, primitive, and composition pattern visible
 * on one scrollable page, with the design reference values written
 * next to the rendered output so visual drift is catchable at a glance.
 *
 * Layout: fixed TOC sidebar (left) + scrollable content (right).
 *
 * Sections grow over Sub-phase B. The Foundations block lands first
 * (this commit) since every primitive section below it references
 * these tokens. Primitive sections land one-per-commit as their
 * implementations are rebuilt.
 *
 * NOTE on the dual color-swatch labels: each color shows its
 * `--fn-<name>` variable AND the OKLCH value from
 * `packages/config/tailwind/fn-tokens.css`. The OKLCH is hard-coded
 * here (not read at runtime) so the swatch survives SSR and is
 * grep-comparable against the source file when the design changes.
 */
import Link from 'next/link';
import { TOKENS } from './_data/tokens';
import { LabelSection } from './_sections/label';
import { SeparatorSection } from './_sections/separator';
import { SpinnerSection } from './_sections/spinner';
import { ButtonSection } from './_sections/button';
import { InputSection } from './_sections/input';
import { TextareaSection } from './_sections/textarea';
import { CheckboxSection } from './_sections/checkbox';
import { RadioGroupSection } from './_sections/radio-group';
import { SwitchSection } from './_sections/switch';
import { SelectSection } from './_sections/select';
import { ComboboxSection } from './_sections/combobox';

export const metadata = {
  title: 'Style Guide — Futurenostics',
};

const TOC = [
  {
    label: 'Foundations',
    items: [
      { id: 'colors-surfaces', label: 'Colors · Surfaces' },
      { id: 'colors-accent', label: 'Colors · Accent + Semantic' },
      { id: 'colors-avatar', label: 'Colors · Avatar / Chip palette' },
      { id: 'typography-sizes', label: 'Typography · Sizes' },
      { id: 'typography-weights', label: 'Typography · Weights' },
      { id: 'typography-leading', label: 'Typography · Line height' },
      { id: 'typography-tracking', label: 'Typography · Letter spacing' },
      { id: 'spacing', label: 'Spacing scale' },
      { id: 'radius', label: 'Radius scale' },
      { id: 'shadow', label: 'Shadow scale' },
      { id: 'duration', label: 'Transition · Duration + easing' },
      { id: 'sizing-primitives', label: 'Sizing · Avatar / Icon tile' },
    ],
  },
  {
    label: 'Tier 1 · Atoms',
    items: [
      { id: 'primitive-label', label: 'Label' },
      { id: 'primitive-separator', label: 'Separator' },
      { id: 'primitive-spinner', label: 'Spinner' },
    ],
  },
  {
    label: 'Tier 2 · Form atoms',
    items: [{ id: 'primitive-button', label: 'Button' }],
  },
  {
    label: 'Primitives — coming next',
    items: [
      { id: 'tier-2-rest', label: 'Tier 2 rest · Input / Textarea / Switch / etc.' },
      { id: 'tier-3', label: 'Tier 3 · Display atoms' },
      { id: 'tier-4', label: 'Tier 4 · Containers' },
      { id: 'tier-5', label: 'Tier 5 · Compound' },
      { id: 'tier-6', label: 'Tier 6 · Form composition' },
      { id: 'tier-7', label: 'Tier 7 · Data — Table' },
    ],
  },
];

export default function StyleGuidePage() {
  return (
    <div className="bg-fn-bg text-fn-fg flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="px-fn-7 py-fn-7 mx-auto max-w-[1100px]">
          <Header />
          <div className="mt-fn-7 gap-fn-8 flex flex-col">
            <Foundations />
            <PrimitivesSection />
          </div>
        </div>
      </main>
    </div>
  );
}

/* ============================================================
 * Header
 * ============================================================ */
function Header() {
  return (
    <header className="gap-fn-2 flex flex-col">
      <span className="text-fn-fg-faint text-fn-sm font-fn-semibold tracking-fn-uppercase uppercase">
        Foundation Reset · Sub-phase B
      </span>
      <h1 className="text-fn-fg text-fn-4xl font-fn-semibold tracking-fn-display-tight">
        Style guide
      </h1>
      <p className="text-fn-fg-muted text-fn-md leading-fn-normal max-w-[600px]">
        Every token from <code className="text-fn-fg font-mono">fn-tokens.css</code> and every
        primitive in <code className="text-fn-fg font-mono">components/ui/</code>, rendered with the
        design&apos;s reference value beside it. This page is the verification surface — when a
        primitive&apos;s section here matches the corresponding section of the design&apos;s{' '}
        <Link
          className="text-fn-accent underline-offset-2 hover:underline"
          href="/Users/sheharyarahmed/Documents/futurehrms/docs/design/Futurenostics HRMS.html"
        >
          rendered HTML
        </Link>
        , the primitive is done.
      </p>
    </header>
  );
}

/* ============================================================
 * Sidebar TOC
 * ============================================================ */
function Sidebar() {
  return (
    <aside className="bg-fn-bg-subtle border-fn-border w-fn-sidebar-full sticky top-0 hidden h-screen shrink-0 overflow-y-auto border-r lg:block">
      <div className="px-fn-5 py-fn-6">
        <div className="text-fn-fg font-fn-semibold text-fn-md tracking-fn-display-tight">
          Style guide
        </div>
        <div className="text-fn-fg-faint text-fn-sm-plus mt-fn-0_5">v0 · foundations only</div>
      </div>
      <nav className="gap-fn-6 px-fn-3 pb-fn-7 flex flex-col">
        {TOC.map((group) => (
          <div key={group.label} className="gap-fn-1 flex flex-col">
            <div className="text-fn-fg-faint text-fn-sm font-fn-semibold tracking-fn-uppercase px-fn-2 pb-fn-1 uppercase">
              {group.label}
            </div>
            {group.items.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="text-fn-fg-muted hover:bg-fn-bg-inset hover:text-fn-fg rounded-fn-xs px-fn-2 py-fn-1 text-fn-base-plus transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}

/* ============================================================
 * Foundations
 * ============================================================ */
function Foundations() {
  return (
    <section className="gap-fn-8 flex flex-col">
      <SectionHeader title="Foundations" anchor="foundations" />
      <ColorsSurfaces />
      <ColorsAccent />
      <ColorsAvatar />
      <TypographySizes />
      <TypographyWeights />
      <TypographyLeading />
      <TypographyTracking />
      <SpacingScale />
      <RadiusScale />
      <ShadowScale />
      <DurationEasing />
      <SizingPrimitives />
    </section>
  );
}

function ColorsSurfaces() {
  return (
    <Subsection anchor="colors-surfaces" title="Colors · Surfaces / borders / foreground">
      <SwatchGrid items={TOKENS.surfaces} />
    </Subsection>
  );
}

function ColorsAccent() {
  return (
    <Subsection anchor="colors-accent" title="Colors · Accent + Semantic">
      <SwatchGrid items={TOKENS.accent} />
      <SwatchGrid items={TOKENS.semantic} />
    </Subsection>
  );
}

function ColorsAvatar() {
  return (
    <Subsection
      anchor="colors-avatar"
      title="Colors · Avatar / Chip 10-hue palette"
      description="Deterministic per-entity colors. employees/lib/employee-colors.ts hashes a name → one of these 10 hues."
    >
      <div className="gap-fn-3 grid grid-cols-2 sm:grid-cols-5">
        {TOKENS.avatarHues.map((h) => (
          <div
            key={h.name}
            className="bg-fn-bg-panel rounded-fn-xs border-fn-border gap-fn-3 p-fn-3 flex items-center border"
          >
            <div
              className="rounded-fn-sm h-fn-9 w-fn-9 text-fn-base font-fn-semibold flex shrink-0 items-center justify-center"
              style={{
                background: `var(--fn-avatar-bg-${h.name})`,
                color: `var(--fn-avatar-fg-${h.name})`,
              }}
            >
              {h.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="text-fn-fg text-fn-base font-fn-medium capitalize">{h.name}</span>
              <span className="text-fn-fg-faint text-fn-sm-plus font-mono">hue {h.hue}</span>
            </div>
          </div>
        ))}
      </div>
    </Subsection>
  );
}

function TypographySizes() {
  return (
    <Subsection
      anchor="typography-sizes"
      title="Typography · Sizes"
      description="Every distinct px value used in the design. Fractional values are intentional (13.5 stays 13.5, not 13 or 14)."
    >
      <div className="border-fn-divider divide-fn-divider rounded-fn-xs border-fn-border bg-fn-bg-panel divide-y border">
        {TOKENS.fontSizes.map((s) => (
          <div
            key={s.token}
            className="gap-fn-4 px-fn-4 py-fn-3 grid grid-cols-[180px_120px_1fr] items-baseline"
          >
            <code className="text-fn-fg-muted text-fn-sm-plus font-mono">text-{s.token}</code>
            <span className="text-fn-fg-faint text-fn-sm font-mono tabular-nums">{s.value}</span>
            <span className="text-fn-fg" style={{ fontSize: s.value }}>
              The quick brown fox
            </span>
          </div>
        ))}
      </div>
    </Subsection>
  );
}

function TypographyWeights() {
  return (
    <Subsection anchor="typography-weights" title="Typography · Weights">
      <div className="border-fn-divider divide-fn-divider rounded-fn-xs border-fn-border bg-fn-bg-panel divide-y border">
        {TOKENS.fontWeights.map((w) => (
          <div
            key={w.token}
            className="gap-fn-4 px-fn-4 py-fn-3 grid grid-cols-[180px_120px_1fr] items-baseline"
          >
            <code className="text-fn-fg-muted text-fn-sm-plus font-mono">font-{w.token}</code>
            <span className="text-fn-fg-faint text-fn-sm font-mono tabular-nums">{w.value}</span>
            <span className="text-fn-fg text-fn-lg-plus" style={{ fontWeight: w.value }}>
              The quick brown fox jumps
            </span>
          </div>
        ))}
      </div>
    </Subsection>
  );
}

function TypographyLeading() {
  return (
    <Subsection anchor="typography-leading" title="Typography · Line height">
      <div className="border-fn-divider divide-fn-divider rounded-fn-xs border-fn-border bg-fn-bg-panel divide-y border">
        {TOKENS.lineHeights.map((l) => (
          <div
            key={l.token}
            className="gap-fn-4 px-fn-4 py-fn-3 grid grid-cols-[180px_80px_1fr] items-start"
          >
            <code className="text-fn-fg-muted text-fn-sm-plus font-mono">leading-{l.token}</code>
            <span className="text-fn-fg-faint text-fn-sm font-mono tabular-nums">{l.value}</span>
            <p className="text-fn-fg text-fn-base max-w-[480px]" style={{ lineHeight: l.value }}>
              A paragraph that spans more than one line so the rhythm becomes apparent — see how
              tight or loose the stacked baselines feel against each other.
            </p>
          </div>
        ))}
      </div>
    </Subsection>
  );
}

function TypographyTracking() {
  return (
    <Subsection anchor="typography-tracking" title="Typography · Letter spacing">
      <div className="border-fn-divider divide-fn-divider rounded-fn-xs border-fn-border bg-fn-bg-panel divide-y border">
        {TOKENS.tracking.map((t) => (
          <div
            key={t.token}
            className="gap-fn-4 px-fn-4 py-fn-3 grid grid-cols-[280px_120px_1fr] items-baseline"
          >
            <code className="text-fn-fg-muted text-fn-sm-plus font-mono">tracking-{t.token}</code>
            <span className="text-fn-fg-faint text-fn-sm font-mono tabular-nums">{t.value}</span>
            <span className="text-fn-fg text-fn-lg" style={{ letterSpacing: t.value }}>
              QUICK BROWN FOX · 1234567890
            </span>
          </div>
        ))}
      </div>
    </Subsection>
  );
}

function SpacingScale() {
  return (
    <Subsection
      anchor="spacing"
      title="Spacing scale"
      description="Bars at the right show the actual rendered size. Every value used by the design has a token."
    >
      <div className="border-fn-divider divide-fn-divider rounded-fn-xs border-fn-border bg-fn-bg-panel divide-y border">
        {TOKENS.spacing.map((s) => (
          <div
            key={s.token}
            className="gap-fn-4 px-fn-4 py-fn-2_5 grid grid-cols-[180px_80px_1fr] items-center"
          >
            <code className="text-fn-fg-muted text-fn-sm-plus font-mono">{s.token}</code>
            <span className="text-fn-fg-faint text-fn-sm font-mono tabular-nums">{s.value}</span>
            <div className="bg-fn-accent h-fn-2 rounded-fn-px" style={{ width: s.value }} />
          </div>
        ))}
      </div>
    </Subsection>
  );
}

function RadiusScale() {
  return (
    <Subsection anchor="radius" title="Radius scale">
      <div className="gap-fn-3 grid grid-cols-2 sm:grid-cols-4">
        {TOKENS.radius.map((r) => (
          <div
            key={r.token}
            className="bg-fn-bg-panel border-fn-border gap-fn-2 p-fn-4 flex flex-col items-center border"
            style={{ borderRadius: r.value }}
          >
            <div className="bg-fn-accent-soft h-fn-12 w-fn-12" style={{ borderRadius: r.value }} />
            <code className="text-fn-fg-muted text-fn-sm font-mono">{r.token}</code>
            <span className="text-fn-fg-faint text-fn-sm font-mono tabular-nums">{r.value}</span>
          </div>
        ))}
      </div>
    </Subsection>
  );
}

function ShadowScale() {
  return (
    <Subsection anchor="shadow" title="Shadow scale">
      <div className="gap-fn-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {TOKENS.shadows.map((s) => (
          <div
            key={s.token}
            className="bg-fn-bg-panel rounded-fn-xs gap-fn-2 p-fn-6 flex flex-col items-center"
            style={{ boxShadow: `var(--fn-shadow-${s.token})` }}
          >
            <code className="text-fn-fg-muted text-fn-sm font-mono">shadow-fn-{s.token}</code>
            <span className="text-fn-fg-faint text-fn-sm max-w-[200px] text-center font-mono">
              {s.description}
            </span>
          </div>
        ))}
      </div>
    </Subsection>
  );
}

function DurationEasing() {
  return (
    <Subsection anchor="duration" title="Transition · Duration + easing">
      <div className="gap-fn-3 grid grid-cols-1 md:grid-cols-2">
        <div className="border-fn-divider divide-fn-divider rounded-fn-xs border-fn-border bg-fn-bg-panel divide-y border">
          <div className="text-fn-fg-faint text-fn-sm font-fn-semibold tracking-fn-uppercase px-fn-4 py-fn-2_5 uppercase">
            Duration
          </div>
          {TOKENS.durations.map((d) => (
            <div
              key={d.token}
              className="gap-fn-4 px-fn-4 py-fn-3 grid grid-cols-[180px_1fr] items-baseline"
            >
              <code className="text-fn-fg-muted text-fn-sm-plus font-mono">duration-{d.token}</code>
              <span className="text-fn-fg-faint text-fn-sm font-mono tabular-nums">{d.value}</span>
            </div>
          ))}
        </div>
        <div className="border-fn-divider divide-fn-divider rounded-fn-xs border-fn-border bg-fn-bg-panel divide-y border">
          <div className="text-fn-fg-faint text-fn-sm font-fn-semibold tracking-fn-uppercase px-fn-4 py-fn-2_5 uppercase">
            Easing
          </div>
          {TOKENS.easings.map((e) => (
            <div
              key={e.token}
              className="gap-fn-4 px-fn-4 py-fn-3 grid grid-cols-[180px_1fr] items-baseline"
            >
              <code className="text-fn-fg-muted text-fn-sm-plus font-mono">ease-{e.token}</code>
              <span className="text-fn-fg-faint text-fn-sm font-mono">{e.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Subsection>
  );
}

function SizingPrimitives() {
  return (
    <Subsection
      anchor="sizing-primitives"
      title="Sizing · Avatar / Icon tile primitives"
      description="Off-scale semantic tokens for repeated component sizes."
    >
      <div className="gap-fn-4 flex flex-col">
        <div>
          <div className="text-fn-fg-faint text-fn-sm font-fn-semibold tracking-fn-uppercase pb-fn-2 uppercase">
            Avatar
          </div>
          <div className="gap-fn-4 flex flex-wrap items-end">
            {TOKENS.avatarSizes.map((a) => (
              <div key={a.token} className="gap-fn-1 flex flex-col items-center">
                <div
                  className="bg-fn-accent-soft text-fn-accent-soft-fg rounded-fn-full text-fn-sm font-fn-semibold flex items-center justify-center"
                  style={{ width: a.value, height: a.value }}
                >
                  AB
                </div>
                <code className="text-fn-fg-muted text-fn-sm font-mono">{a.token}</code>
                <span className="text-fn-fg-faint text-fn-sm font-mono tabular-nums">
                  {a.value}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-fn-fg-faint text-fn-sm font-fn-semibold tracking-fn-uppercase pb-fn-2 uppercase">
            Icon tile
          </div>
          <div className="gap-fn-4 flex flex-wrap items-end">
            {TOKENS.iconTileSizes.map((t) => (
              <div key={t.token} className="gap-fn-1 flex flex-col items-center">
                <div
                  className="bg-fn-icon-tile text-fn-icon-tile-fg flex items-center justify-center"
                  style={{ width: t.value, height: t.value, borderRadius: t.radius }}
                >
                  ✦
                </div>
                <code className="text-fn-fg-muted text-fn-sm font-mono">{t.token}</code>
                <span className="text-fn-fg-faint text-fn-sm font-mono tabular-nums">
                  {t.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Subsection>
  );
}

/* ============================================================
 * Primitives — grows one primitive at a time
 * ============================================================ */
function PrimitivesSection() {
  return (
    <section className="gap-fn-8 flex flex-col">
      <SectionHeader title="Primitives" anchor="primitives" />
      <LabelSection />
      <SeparatorSection />
      <SpinnerSection />
      <ButtonSection />
      <InputSection />
      <TextareaSection />
      <CheckboxSection />
      <RadioGroupSection />
      <SwitchSection />
      <SelectSection />
      <ComboboxSection />
      <div className="bg-fn-bg-panel border-fn-border rounded-fn-xs p-fn-6 border">
        <p className="text-fn-fg-muted text-fn-base leading-fn-normal max-w-[640px]">
          Tier 1 atoms (Label · Separator · Spinner) are now live. Coming next: Tier 2 Form atoms —
          Button, Input, Textarea, Select, Combobox, Checkbox, Radio, Switch.
        </p>
      </div>
    </section>
  );
}

/* ============================================================
 * Section primitives
 * ============================================================ */
function SectionHeader({ title, anchor }: { title: string; anchor: string }) {
  return (
    <div
      id={anchor}
      className="border-fn-border gap-fn-3 pb-fn-3 flex items-baseline justify-between border-b"
    >
      <h2 className="text-fn-fg text-fn-3xl font-fn-semibold tracking-fn-display-tight">{title}</h2>
    </div>
  );
}

function Subsection({
  anchor,
  title,
  description,
  children,
}: {
  anchor: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div id={anchor} className="gap-fn-3 scroll-mt-fn-7 flex flex-col">
      <div className="gap-fn-1 flex flex-col">
        <h3 className="text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight">
          {title}
        </h3>
        {description && (
          <p className="text-fn-fg-muted text-fn-base-plus leading-fn-normal max-w-[640px]">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

function SwatchGrid({ items }: { items: ReadonlyArray<{ token: string; value: string }> }) {
  return (
    <div className="gap-fn-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((c) => (
        <div
          key={c.token}
          className="bg-fn-bg-panel rounded-fn-xs border-fn-border gap-fn-3 p-fn-2_5 flex items-center border"
        >
          <div
            className="rounded-fn-xs border-fn-border h-fn-10 w-fn-10 shrink-0 border"
            style={{ background: `var(--fn-${c.token})` }}
          />
          <div className="flex min-w-0 flex-col">
            <code className="text-fn-fg text-fn-sm-plus truncate font-mono">--fn-{c.token}</code>
            <span className="text-fn-fg-faint text-fn-sm truncate font-mono">{c.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
