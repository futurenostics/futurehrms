'use client';

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';

/*
 * Avatar primitive.
 *
 * Design uses 5 sizes (20/24/28/32/36/48/64). Default is md (28).
 * EmployeeAvatar (components/employees/) wraps this with the
 * deterministic 10-hue palette mapping; this primitive itself
 * defaults to fn-accent-soft for the fallback tile when no
 * tone is provided.
 *
 * Default shape is circle (rounded-fn-full) — pass className with
 * rounded-fn-sm etc. for the squircle variant used in dense tables.
 */
const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      'rounded-fn-full h-fn-9 w-fn-9 relative flex shrink-0 overflow-hidden',
      className,
    )}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full', className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'bg-fn-accent-soft text-fn-accent-soft-fg text-fn-base-lo font-fn-medium tracking-fn-tight flex h-full w-full items-center justify-center',
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };
