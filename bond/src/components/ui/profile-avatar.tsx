import { cn, initials } from '@/lib/utils';

interface ProfileAvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = { sm: 'h-10 w-10 text-sm', md: 'h-14 w-14 text-base', lg: 'h-20 w-20 text-xl' };

export function ProfileAvatar({ name, src, size = 'md', className }: ProfileAvatarProps) {
  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-gradient font-semibold text-primary-foreground',
        SIZES[size],
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
      <span className="sr-only">{name}</span>
    </div>
  );
}
