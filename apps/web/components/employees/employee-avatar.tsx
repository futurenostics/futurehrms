import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { avatarColorsFor } from '@/lib/employee-colors';
import { cn } from '@/lib/utils';

const SIZE_CLASS: Record<NonNullable<EmployeeAvatarProps['size']>, string> = {
  sm: 'h-7 w-7 text-[10px] rounded-[6px]',
  md: 'h-9 w-9 text-[12.5px] rounded-[8px]',
  lg: 'h-14 w-14 text-[16px] rounded-[10px]',
  xl: 'h-20 w-20 text-[20px] rounded-[14px]',
};

interface EmployeeAvatarProps {
  fullName: string;
  photoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

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

  return (
    <Avatar className={cn('shrink-0', SIZE_CLASS[size], className)}>
      {photoUrl && <AvatarImage src={photoUrl} alt={fullName} className="rounded-[inherit]" />}
      <AvatarFallback
        className="rounded-[inherit] font-semibold tracking-tight"
        style={{ background: colors.background, color: colors.color, letterSpacing: '-0.02em' }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
