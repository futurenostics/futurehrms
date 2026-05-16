'use client';

import { useTheme } from 'next-themes';
import { Toaster as SonnerToaster, type ToasterProps } from 'sonner';

export function Toaster({ ...props }: ToasterProps) {
  const { theme = 'system' } = useTheme();
  return (
    <SonnerToaster
      theme={theme as ToasterProps['theme']}
      richColors
      closeButton
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-fn-bg-panel group-[.toaster]:text-fn-fg group-[.toaster]:border-fn-border group-[.toaster]:shadow-fn-md',
          description: 'group-[.toast]:text-fn-fg-muted',
          actionButton: 'group-[.toast]:bg-fn-accent group-[.toast]:text-fn-accent-fg',
          cancelButton: 'group-[.toast]:bg-fn-bg-inset group-[.toast]:text-fn-fg-muted',
        },
      }}
      {...props}
    />
  );
}
