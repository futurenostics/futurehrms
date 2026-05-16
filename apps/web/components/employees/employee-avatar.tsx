import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { avatarColorsFor } from '@/lib/employee-colors';
import { cn } from '@/lib/utils';

interface EmployeeAvatarProps {
  fullName: string;
  photoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<EmployeeAvatarProps['size']>, string> = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-[12.5px]',
  lg: 'h-14 w-14 text-[16px]',
  xl: 'h-20 w-20 text-[20px]',
};

// Inline-style radius wins over the shadcn Avatar base's `rounded-fn-full`
// regardless of how tw-merge groups custom utilities. The other Avatar
// consumers (sidebar user-block, topbar account menu) stay circular
// because they don't touch this component.
const RADIUS_PX: Record<NonNullable<EmployeeAvatarProps['size']>, number> = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 14,
};

/**
 * Soft-pastel rounded-square avatar with deterministic colors derived
 * from the employee's name (see lib/employee-colors). Same person =
 * same color across the list, profile, org chart, dropdowns, etc.
 *
 * Slightly-rounded square (not a circle) to match the design's
 * Employee column avatars; size scale tuned so list/profile/header
 * use the same shape language at different sizes.
 */
export function EmployeeAvatar({
  fullName,
  photoUrl,
  size = 'md',
  className,
}: EmployeeAvatarProps) {
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const colors = avatarColorsFor(fullName);
  const radius = RADIUS_PX[size];

  return (
    <Avatar
      className={cn('shrink-0', SIZE_CLASS[size], className)}
      style={{ borderRadius: radius }}
    >
      {photoUrl && <AvatarImage src={photoUrl} alt={fullName} style={{ borderRadius: radius }} />}
      <AvatarFallback
        className="font-semibold tracking-tight"
        style={{
          background: colors.background,
          color: colors.color,
          borderRadius: radius,
          letterSpacing: '-0.02em',
        }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
