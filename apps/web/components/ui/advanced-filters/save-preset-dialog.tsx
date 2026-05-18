'use client';

import * as React from 'react';
import { Bookmark } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Lightweight save-preset prompt — replaces the placeholder
 * `window.prompt` in the v1 implementation. Returns the trimmed name
 * via `onConfirm`; the parent owns the actual savePreset() call.
 */

export function SavePresetDialog({
  open,
  onOpenChange,
  onConfirm,
  defaultName = '',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string) => void;
  defaultName?: string;
}) {
  const [name, setName] = React.useState(defaultName);
  React.useEffect(() => {
    if (open) setName(defaultName);
  }, [open, defaultName]);

  const trimmed = name.trim();
  const valid = trimmed.length >= 1 && trimmed.length <= 60;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    onConfirm(trimmed);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="gap-fn-2 flex items-center">
            <span
              aria-hidden
              className="rounded-fn-xs bg-fn-icon-tile text-fn-icon-tile-fg h-fn-7 w-fn-7 inline-flex items-center justify-center"
            >
              <Bookmark className="h-fn-3_5 w-fn-3_5" />
            </span>
            <div>
              <DialogTitle>Save filter preset</DialogTitle>
              <DialogDescription>
                Save the current filters as a named preset so you can apply them again with one
                click.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="gap-fn-3 flex flex-col">
          <div className="gap-fn-1_5 flex flex-col">
            <Label htmlFor="preset-name">Preset name</Label>
            <Input
              id="preset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Engineering · Permanent"
              maxLength={60}
              autoFocus
            />
            <p className="text-fn-fg-faint text-[11px]">
              {trimmed.length}/60 — saved to this browser only.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid}>
              Save preset
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
