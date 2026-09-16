'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BottomNav, SideNav } from '@/components/bottom-nav';
import { ListSkeleton } from '@/components/ui/loading-skeleton';
import { useDemoStore } from '@/store/demo-store';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const me = useDemoStore((s) => s.me);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted && !me) router.replace('/login');
  }, [mounted, me, router]);

  if (!mounted) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <ListSkeleton rows={3} />
      </main>
    );
  }

  if (!me) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <ListSkeleton rows={3} />
      </main>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl">
      <SideNav />
      <div className="flex-1">
        <main className="mx-auto min-h-dvh w-full max-w-md px-4 pb-28 pt-6 safe-top md:max-w-2xl md:pb-10">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
