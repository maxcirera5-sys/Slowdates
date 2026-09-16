'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { clientEnv } from '@/lib/env';
import { useDemoStore } from '@/store/demo-store';

export default function LoginPage() {
  const router = useRouter();
  const enterDemo = useDemoStore((s) => s.enterDemo);
  const ensureDraft = useDemoStore((s) => s.ensureDraft);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setNotice('Enter an email and password to continue.');
      return;
    }
    // In DEMO_MODE there is no real auth server; sign into the seeded demo profile.
    if (clientEnv.demoMode) {
      enterDemo();
      router.push('/app/proposals');
      return;
    }
    setNotice('Connect Supabase to enable real email authentication.');
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10 safe-top safe-bottom">
      <div className="mb-8 text-center">
        <Link
          href="/"
          className="bg-brand-gradient bg-clip-text text-3xl font-bold tracking-tight text-transparent"
        >
          BOND
        </Link>
        <p className="mt-2 text-sm text-muted-foreground">
          AI finds the connection. You decide whether to meet.
        </p>
      </div>

      {clientEnv.demoMode ? (
        <div className="mb-6 rounded-lg border border-primary/30 bg-primary/10 p-4 text-center">
          <p className="text-sm text-primary-light">
            Running in <strong>demo mode</strong> — no account needed.
          </p>
          <Button
            className="mt-3"
            size="block"
            onClick={() => {
              enterDemo();
              router.push('/app/proposals');
            }}
          >
            <Play className="h-4 w-4" /> Enter demo
          </Button>
        </div>
      ) : null}

      <form onSubmit={handleEmailAuth} className="space-y-4">
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {notice ? <p className="text-sm text-warning">{notice}</p> : null}
        <Button type="submit" size="block">
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        variant="secondary"
        size="block"
        disabled={!clientEnv.googleOAuthEnabled}
        onClick={() => setNotice('Google sign-in is configured in the Supabase dashboard.')}
      >
        Continue with Google
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Apple sign-in coming soon.
      </p>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        New here?{' '}
        <button
          type="button"
          className="font-semibold text-primary-light underline"
          onClick={() => {
            ensureDraft();
            router.push('/onboarding');
          }}
        >
          Create your profile
        </button>
      </p>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        By continuing you agree to our{' '}
        <Link href="/terms" className="underline">
          Terms
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        . You must be 18+.
      </p>
    </main>
  );
}
