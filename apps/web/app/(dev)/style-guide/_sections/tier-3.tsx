/**
 * Style-guide sections — Tier 3 display atoms (Badge, Avatar,
 * Tooltip, IconTile).
 *
 * Batched in one file because each is small and they share the
 * same visual language (soft tinted surfaces + matching fg).
 */
'use client';

import { Briefcase, Mail, Sparkles, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { IconTile } from '@/components/ui/icon-tile';
import { Spec } from './label';

const BADGE_VARIANTS = [
  'default',
  'accent',
  'success',
  'warning',
  'danger',
  'info',
  'outline',
] as const;

export function BadgeSection() {
  return (
    <div id="primitive-badge" className="gap-fn-3 scroll-mt-fn-7 flex flex-col">
      <div className="gap-fn-1 flex flex-col">
        <h3 className="text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight">
          Badge
        </h3>
        <p className="text-fn-fg-muted text-fn-base-plus leading-fn-normal max-w-[640px]">
          Soft-tinted pill chip. 12px / weight 600 / leading 1.55 / tracking -0.005em / radius 6. 7
          variants — neutral default + 5 semantic + outline.
        </p>
      </div>

      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs gap-fn-3 p-fn-6 flex flex-wrap items-center border">
        {BADGE_VARIANTS.map((v) => (
          <Badge key={v} variant={v}>
            {v}
          </Badge>
        ))}
      </div>

      <Spec
        items={[
          ['size', 'text-fn-base-lo (12px) · py-fn-0_5 · px-fn-2'],
          ['radius', 'rounded-fn-xs (6)'],
          ['weight / leading / tracking', '600 · 1.55 · -0.005em'],
          ['variants', '7: default · accent · success · warning · danger · info · outline'],
        ]}
      />
    </div>
  );
}

const AVATAR_SIZES = [
  { token: '--fn-avatar-xs', px: 20, classes: 'h-fn-5 w-fn-5 text-fn-sm' },
  { token: '--fn-avatar-sm', px: 24, classes: 'h-fn-6 w-fn-6 text-fn-sm-plus' },
  { token: '--fn-avatar-md', px: 28, classes: 'h-fn-7 w-fn-7 text-fn-base-lo' },
  { token: '--fn-avatar-md-plus', px: 32, classes: 'h-fn-8 w-fn-8 text-fn-base-lo-plus' },
  { token: '--fn-avatar-lg', px: 36, classes: 'h-fn-9 w-fn-9 text-fn-base' },
  { token: '--fn-avatar-xl', px: 48, classes: 'h-fn-12 w-fn-12 text-fn-md' },
  { token: '--fn-avatar-2xl', px: 64, classes: 'h-fn-16 w-fn-16 text-fn-xl' },
] as const;

export function AvatarSection() {
  return (
    <div id="primitive-avatar" className="gap-fn-3 scroll-mt-fn-7 flex flex-col">
      <div className="gap-fn-1 flex flex-col">
        <h3 className="text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight">
          Avatar
        </h3>
        <p className="text-fn-fg-muted text-fn-base-plus leading-fn-normal max-w-[640px]">
          Radix Avatar with fn-accent-soft fallback by default. For deterministic per-entity hues
          (employees table, profile header), use the EmployeeAvatar wrapper which adds the 10-hue
          ring. Default shape is circle; pass{' '}
          <code className="text-fn-fg font-mono">className=&quot;rounded-fn-sm&quot;</code> for the
          squircle variant used in dense tables.
        </p>
      </div>

      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs gap-fn-5 p-fn-6 flex flex-col border">
        <div className="gap-fn-4 flex flex-wrap items-end">
          {AVATAR_SIZES.map((s) => (
            <div key={s.token} className="gap-fn-1 flex flex-col items-center">
              <Avatar className={s.classes}>
                <AvatarFallback>AB</AvatarFallback>
              </Avatar>
              <code className="text-fn-fg-muted text-fn-sm font-mono">{s.px}</code>
            </div>
          ))}
        </div>
        <div className="gap-fn-3 flex items-center">
          <span className="text-fn-fg-muted text-fn-sm">Squircle shape:</span>
          <Avatar className="rounded-fn-sm">
            <AvatarFallback>SQ</AvatarFallback>
          </Avatar>
          <span className="text-fn-fg-muted text-fn-sm">With image:</span>
          <Avatar>
            <AvatarImage
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=64&q=80"
              alt=""
            />
            <AvatarFallback>IM</AvatarFallback>
          </Avatar>
        </div>
      </div>

      <Spec
        items={[
          ['sizes', '20 / 24 / 28 / 32 / 36 / 48 / 64'],
          ['shape', 'circle default (rounded-fn-full) · squircle via className'],
          [
            'fallback',
            'bg-fn-accent-soft + text-fn-accent-soft-fg · weight 500 + tracking-fn-tight',
          ],
          ['behavior', 'Radix Avatar — falls back to <AvatarFallback> if image fails to load'],
        ]}
      />
    </div>
  );
}

export function TooltipSection() {
  return (
    <div id="primitive-tooltip" className="gap-fn-3 scroll-mt-fn-7 flex flex-col">
      <div className="gap-fn-1 flex flex-col">
        <h3 className="text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight">
          Tooltip
        </h3>
        <p className="text-fn-fg-muted text-fn-base-plus leading-fn-normal max-w-[640px]">
          Dark fg panel + light fg-invert text. 12px medium. 4px offset from the trigger with a 5px
          arrow. 300ms default delay (set via TooltipProvider).
        </p>
      </div>

      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs gap-fn-4 p-fn-6 flex items-center border">
        <TooltipProvider delayDuration={150}>
          {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
            <Tooltip key={side}>
              <TooltipTrigger className="text-fn-fg rounded-fn-xs border-fn-border bg-fn-bg-panel px-fn-3 py-fn-1_5 text-fn-base cursor-default border">
                hover {side}
              </TooltipTrigger>
              <TooltipContent side={side}>Tooltip on {side}</TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>

      <Spec
        items={[
          ['panel', 'bg-fn-fg · text-fn-fg-invert · rounded-fn-xs · shadow-fn-md'],
          ['padding', 'px-fn-2_5 (10) · py-fn-1_5 (6)'],
          ['font', 'text-fn-base-lo (12) · font-fn-medium'],
          ['arrow', '10×5 fill-fn-fg'],
          ['offset', '4px from trigger (sideOffset prop)'],
          ['delay', '300ms default (configurable via TooltipProvider)'],
        ]}
      />
    </div>
  );
}

export function IconTileSection() {
  return (
    <div id="primitive-icon-tile" className="gap-fn-3 scroll-mt-fn-7 flex flex-col">
      <div className="gap-fn-1 flex flex-col">
        <h3 className="text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight">
          IconTile
        </h3>
        <p className="text-fn-fg-muted text-fn-base-plus leading-fn-normal max-w-[640px]">
          Soft-fill square holding a stroked icon. Used by SectionHeader, KPI card, EmptyState, and
          Sheet header. 4 sizes × 6 semantic tones.
        </p>
      </div>

      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs gap-fn-5 p-fn-6 flex flex-col border">
        <div>
          <div className="text-fn-fg-faint text-fn-sm font-fn-semibold tracking-fn-uppercase pb-fn-2 uppercase">
            Sizes (default tone)
          </div>
          <div className="gap-fn-4 flex flex-wrap items-end">
            {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
              <div key={size} className="gap-fn-1 flex flex-col items-center">
                <IconTile size={size}>
                  <Sparkles />
                </IconTile>
                <code className="text-fn-fg-muted text-fn-sm font-mono">{size}</code>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-fn-fg-faint text-fn-sm font-fn-semibold tracking-fn-uppercase pb-fn-2 uppercase">
            Tones (md size)
          </div>
          <div className="gap-fn-3 flex flex-wrap items-center">
            <IconTile tone="default">
              <Sparkles />
            </IconTile>
            <IconTile tone="accent">
              <Sparkles />
            </IconTile>
            <IconTile tone="success">
              <Sparkles />
            </IconTile>
            <IconTile tone="warning">
              <Sparkles />
            </IconTile>
            <IconTile tone="danger">
              <Sparkles />
            </IconTile>
            <IconTile tone="info">
              <Sparkles />
            </IconTile>
          </div>
        </div>
        <div>
          <div className="text-fn-fg-faint text-fn-sm font-fn-semibold tracking-fn-uppercase pb-fn-2 uppercase">
            Common patterns
          </div>
          <div className="gap-fn-4 flex flex-wrap items-center">
            <div className="gap-fn-3 flex items-center">
              <IconTile size="md" tone="accent">
                <Users />
              </IconTile>
              <span className="text-fn-fg text-fn-md font-fn-semibold">Employees</span>
            </div>
            <div className="gap-fn-3 flex items-center">
              <IconTile size="lg" tone="success">
                <Mail />
              </IconTile>
              <span className="text-fn-fg text-fn-md font-fn-semibold">Inbox</span>
            </div>
            <div className="gap-fn-3 flex items-center">
              <IconTile size="xl" tone="info">
                <Briefcase />
              </IconTile>
              <span className="text-fn-fg text-fn-md font-fn-semibold">Projects</span>
            </div>
          </div>
        </div>
      </div>

      <Spec
        items={[
          ['sm', '28 × 28 · rounded-fn-xs-plus (7) · icon 14'],
          ['md', '36 × 36 · rounded-fn-sm (8) · icon 16'],
          ['lg', '40 × 40 · rounded-fn-md (10) · icon 18'],
          ['xl', '48 × 48 · rounded-fn-lg (14) · icon 22'],
          ['tones', 'default · accent · success · warning · danger · info'],
        ]}
      />
    </div>
  );
}
