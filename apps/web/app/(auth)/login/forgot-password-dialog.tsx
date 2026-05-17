'use client';

import { Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/**
 * Placeholder forgot-password flow.
 *
 * Self-service password reset is a future phase — for now the dialog
 * points the user at the HR mailbox so they don't get stuck. The
 * Forgot Password link from the login form opens this instead of
 * navigating to a 404.
 */
export function ForgotPasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <div className="gap-fn-2_5 flex items-center">
            <div
              className="rounded-fn-md h-fn-9 w-fn-9 flex items-center justify-center"
              style={{
                background: 'var(--fn-icon-tile)',
                color: 'var(--fn-icon-tile-fg)',
              }}
            >
              <Mail className="h-fn-4 w-fn-4" />
            </div>
            <DialogTitle>Password reset</DialogTitle>
          </div>
          <DialogDescription className="pt-fn-2">
            Password resets are currently handled by HR. Email{' '}
            <a
              href="mailto:hr@futurenostics.com"
              className="text-fn-accent font-fn-medium hover:underline"
            >
              hr@futurenostics.com
            </a>{' '}
            and they will issue you a temporary password. Self-service password reset is coming in a
            future release.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
