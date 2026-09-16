'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ProgressBar } from '@/components/ui/progress-bar';
import { useDemoStore } from '@/store/demo-store';

const STEPS = [
  '/onboarding/basics',
  '/onboarding/photos',
  '/onboarding/preferences',
  '/onboarding/questions',
  '/onboarding/venues',
];

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ensureDraft = useDemoStore((s) => s.ensureDraft);

  useEffect(() => {
    ensureDraft();
  }, [ensureDraft]);

  const stepIndex = STEPS.indexOf(pathname);
  const showProgress = stepIndex >= 0;
  const progress = showProgress ? ((stepIndex + 1) / STEPS.length) * 100 : 0;

  return (
    <div className="mx-auto min-h-dvh max-w-md px-5 pb-10 pt-4 safe-top">
      <header className="mb-6 flex items-center gap-3">
        <Link
          href="/"
          aria-label="Exit onboarding"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-elevated hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          {showProgress ? (
            <>
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>
                  Step {stepIndex + 1} of {STEPS.length}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <ProgressBar value={progress} label="Onboarding progress" />
            </>
          ) : (
            <span className="bg-brand-gradient bg-clip-text text-lg font-bold text-transparent">
              BOND
            </span>
          )}
        </div>
      </header>
      {children}
    </div>
  );
}
