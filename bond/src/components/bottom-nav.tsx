'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarHeart, Heart, Sparkles, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/app/proposals', label: 'Proposals', icon: Heart },
  { href: '/app/dates', label: 'Dates', icon: CalendarHeart },
  { href: '/app/ai-profile', label: 'AI Profile', icon: Sparkles },
  { href: '/app/profile', label: 'Profile', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="glass fixed inset-x-0 bottom-0 z-40 border-t border-border safe-bottom md:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-1 pt-2">
        {ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-medium transition-colors',
                  active ? 'text-primary-light' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-6 w-6" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-border p-4 md:flex"
    >
      <div className="mb-6 px-2 pt-2">
        <span className="bg-brand-gradient bg-clip-text text-2xl font-bold tracking-tight text-transparent">
          BOND
        </span>
      </div>
      {ITEMS.map((item) => {
        const active = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-elevated text-primary-light'
                : 'text-muted-foreground hover:bg-elevated hover:text-foreground',
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
