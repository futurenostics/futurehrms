import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const SIZE_CLASS: Record<NonNullable<EmployeeAvatarProps['size']>, string> = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-[12px]',
  lg: 'h-14 w-14 text-[16px]',
  xl: 'h-20 w-20 text-[20px]',
};

interface EmployeeAvatarProps {
  fullName: string;
  photoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

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
  return (
    <Avatar className={cn('shrink-0', SIZE_CLASS[size], className)}>
      {photoUrl && <AvatarImage src={photoUrl} alt={fullName} />}
      <AvatarFallback className="font-semibold">{initials}</AvatarFallback>
    </Avatar>
  );
}
