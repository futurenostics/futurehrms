/**
 * Style-guide sections — Tier 4 containers (Card / Popover /
 * Dialog / Sheet / DropdownMenu).
 *
 * Each shipped in this batch matches its design spec; Sheet
 * additionally gains width variants + sticky header/body/footer
 * composition slots to unblock the parked employee-sheet refactor.
 */
'use client';

import * as React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Spec } from './label';

export function CardSection() {
  return (
    <div id="primitive-card" className="gap-fn-3 scroll-mt-fn-7 flex flex-col">
      <div className="gap-fn-1 flex flex-col">
        <h3 className="text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight">
          Card
        </h3>
        <p className="text-fn-fg-muted text-fn-base-plus leading-fn-normal max-w-[640px]">
          rounded-fn-xs (6px) panel with 1px fn-border + shadow-fn-sm. Default padding 24px via
          Header / Content / Footer subcomponents. Header has a 1px divider underneath; Footer has
          one above.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Card title</CardTitle>
          <CardDescription>Optional subtitle in fn-fg-muted, 13px regular.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-fn-fg text-fn-base leading-fn-normal">
            Card content sits inside CardContent. Use this for KPI tiles, status panels, any grouped
            information block.
          </p>
        </CardContent>
        <CardFooter className="gap-fn-2 justify-end">
          <Button variant="ghost">Cancel</Button>
          <Button>Save</Button>
        </CardFooter>
      </Card>
      <Spec
        items={[
          ['radius', 'rounded-fn-xs (6)'],
          ['border / bg / shadow', '1px fn-border · fn-bg-panel · shadow-fn-sm'],
          ['Header / Content / Footer padding', 'p-fn-6 (24px)'],
          ['Header / Footer divider', '1px fn-divider'],
          ['Title', 'text-fn-lg-plus font-fn-semibold leading-fn-unit'],
          ['Description', 'text-fn-base text-fn-fg-muted'],
        ]}
      />
    </div>
  );
}

export function PopoverSection() {
  return (
    <div id="primitive-popover" className="gap-fn-3 scroll-mt-fn-7 flex flex-col">
      <div className="gap-fn-1 flex flex-col">
        <h3 className="text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight">
          Popover
        </h3>
        <p className="text-fn-fg-muted text-fn-base-plus leading-fn-normal max-w-[640px]">
          rounded-fn-sm (8px) floating panel with shadow-fn-md. Default width 288px, padding 16px,
          6px sideOffset. Backs Combobox and the &quot;More filters&quot; popover on the Employees
          list.
        </p>
      </div>
      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs p-fn-6 border">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Open popover</Button>
          </PopoverTrigger>
          <PopoverContent>
            <div className="gap-fn-3 flex flex-col">
              <h4 className="text-fn-fg text-fn-base font-fn-semibold">Display options</h4>
              <p className="text-fn-fg-muted text-fn-base-lo-plus">
                Popovers carry their own scope and dismiss on outside-click + Escape.
              </p>
              <Button size="sm">Apply</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <Spec
        items={[
          ['radius / bg / shadow', 'rounded-fn-sm · bg-fn-bg-panel · shadow-fn-md'],
          ['default width', '288px (override via className w-…)'],
          ['default padding', 'p-fn-4 (16)'],
          ['sideOffset', '6px from trigger'],
          ['animation', 'fade-in zoom-in-95 on open, reverse on close'],
        ]}
      />
    </div>
  );
}

export function DialogSection() {
  const [open, setOpen] = React.useState(false);
  return (
    <div id="primitive-dialog" className="gap-fn-3 scroll-mt-fn-7 flex flex-col">
      <div className="gap-fn-1 flex flex-col">
        <h3 className="text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight">
          Dialog
        </h3>
        <p className="text-fn-fg-muted text-fn-base-plus leading-fn-normal max-w-[640px]">
          Centered modal. rounded-fn-xl (18px), shadow-fn-lg, 50% black overlay, 24px padding,
          built-in close (X) button top-right. Used for confirmations, focused inline forms,
          unsaved-changes prompts.
        </p>
      </div>
      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs p-fn-6 border">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm action</DialogTitle>
              <DialogDescription>
                This will affect the selected employees and is audit-logged.
              </DialogDescription>
            </DialogHeader>
            <div className="gap-fn-1_5 flex flex-col">
              <Label htmlFor="sg-dialog-reason">Reason</Label>
              <Input id="sg-dialog-reason" placeholder="Why are you doing this?" />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setOpen(false)}>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Spec
        items={[
          ['radius / shadow', 'rounded-fn-xl (18) · shadow-fn-lg'],
          ['overlay', '50% black (bg-black/50) · fade'],
          ['max-width', 'lg breakpoint, sm:max-w-lg'],
          ['padding', 'p-fn-6 (24)'],
          ['close', 'X icon top-right, h-fn-4 w-fn-4, opacity 70→100 on hover'],
          ['focus / escape / overlay click', 'all close via Radix Dialog primitive'],
        ]}
      />
    </div>
  );
}

export function SheetSection() {
  return (
    <div id="primitive-sheet" className="gap-fn-3 scroll-mt-fn-7 flex flex-col">
      <div className="gap-fn-1 flex flex-col">
        <h3 className="text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight">
          Sheet
        </h3>
        <p className="text-fn-fg-muted text-fn-base-plus leading-fn-normal max-w-[640px]">
          Side-drawer modal. The design's editor-sheet pattern (Overtime Rules, Commission Rules,
          parked Employee Form). 4 sides × 5 width variants. Composition slots: SheetHeader (sticky
          top), SheetBody (scrollable middle), SheetFooter (sticky bottom).
        </p>
      </div>

      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs p-fn-6 gap-fn-3 flex flex-wrap border">
        {(['sm', 'md', 'lg', 'xl'] as const).map((width) => (
          <Sheet key={width}>
            <SheetTrigger asChild>
              <Button variant="outline">
                Right · {width} ({SIZE_LABEL[width]})
              </Button>
            </SheetTrigger>
            <SheetContent side="right" width={width}>
              <SheetHeader>
                <SheetTitle>Edit employee · {width} width</SheetTitle>
                <SheetDescription>
                  Changes are audit-logged. Cancel discards; Save submits.
                </SheetDescription>
              </SheetHeader>
              <SheetBody>
                <div className="gap-fn-5 flex flex-col">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="gap-fn-3 flex flex-col">
                      <h4 className="text-fn-fg text-fn-lg-plus font-fn-semibold">Section {i}</h4>
                      <div className="gap-fn-4 grid grid-cols-1 sm:grid-cols-2">
                        <div className="gap-fn-1_5 flex flex-col">
                          <Label htmlFor={`sg-sheet-${width}-${i}-a`}>Field A</Label>
                          <Input id={`sg-sheet-${width}-${i}-a`} placeholder="…" />
                        </div>
                        <div className="gap-fn-1_5 flex flex-col">
                          <Label htmlFor={`sg-sheet-${width}-${i}-b`}>Field B</Label>
                          <Input id={`sg-sheet-${width}-${i}-b`} placeholder="…" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </SheetBody>
              <SheetFooter>
                <Button variant="ghost">Cancel</Button>
                <div className="flex-1" />
                <Button>Save changes</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        ))}
      </div>

      <Spec
        items={[
          ['sides', 'top · bottom · left · right (default)'],
          ['widths', 'sm 400 · md 520 (default) · lg 720 · xl 880 · full'],
          ['right-side shadow', 'shadow-fn-drawer-right (design semantic)'],
          ['left-side shadow', 'shadow-fn-drawer-left'],
          ['Header', 'sticky top · border-b fn-divider · py-fn-sheet-y (18) · px-fn-sheet-x (22)'],
          ['Body', 'flex-1 + overflow-y-auto · px-fn-sheet-x · py-fn-sheet-x'],
          ['Footer', 'sticky bottom · border-t fn-divider · py-fn-3_5 (14) · px-fn-sheet-x (22)'],
          ['close', 'X icon top-right, dismissable via Esc / overlay click'],
          ['animation', '300ms slide-in on open · 200ms slide-out on close'],
          ['employee-sheet target', 'lg width, side=right, sticky header/body/footer'],
        ]}
      />
    </div>
  );
}

const SIZE_LABEL = { sm: '400', md: '520', lg: '720', xl: '880' } as const;

export function DropdownMenuSection() {
  return (
    <div id="primitive-dropdown-menu" className="gap-fn-3 scroll-mt-fn-7 flex flex-col">
      <div className="gap-fn-1 flex flex-col">
        <h3 className="text-fn-fg text-fn-xl-plus font-fn-semibold tracking-fn-display-tight">
          DropdownMenu
        </h3>
        <p className="text-fn-fg-muted text-fn-base-plus leading-fn-normal max-w-[640px]">
          Action menu — row kebab on the Employees list, user menu in the shell, etc. Backed by
          Radix DropdownMenu so arrow nav + escape + outside-click are all wired.
        </p>
      </div>
      <div className="border-fn-border bg-fn-bg-panel rounded-fn-xs p-fn-6 border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Open menu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem>
              <Pencil /> Edit details
              <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>View profile</DropdownMenuItem>
            <DropdownMenuItem>Change manager</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-fn-danger focus:text-fn-danger">
              <Trash2 /> Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Spec
        items={[
          ['panel', 'rounded-fn-sm · shadow-fn-md · min-w 10rem'],
          ['item', 'rounded-fn-xs · px-fn-2 · py-fn-1_5 · text-fn-base · 8px icon gap'],
          ['item focus', 'bg-fn-bg-inset'],
          ['label', '11px uppercase fn-fg-faint tracking-fn-uppercase-tight'],
          ['separator', '1px fn-divider, inset -fn-1 horizontal'],
          ['shortcut', 'text-fn-sm fn-fg-faint right-aligned'],
        ]}
      />
    </div>
  );
}
