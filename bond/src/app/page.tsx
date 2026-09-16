import Link from 'next/link';
import {
  ArrowRight,
  CalendarHeart,
  Eye,
  Heart,
  Lock,
  MessageCircleOff,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-brand-radial" aria-hidden />

      {/* Nav */}
      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-5 py-5 safe-top">
        <span className="bg-brand-gradient bg-clip-text text-2xl font-bold tracking-tight text-transparent">
          BOND
        </span>
        <Link
          href="/login"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-3xl px-5 pb-8 pt-10 text-center md:pt-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs font-medium text-primary-light">
          <Sparkles className="h-3.5 w-3.5" aria-hidden /> AI-powered matchmaking
        </span>
        <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
          AI finds the connection.
          <br />
          <span className="bg-brand-gradient bg-clip-text text-transparent">
            You decide whether to meet.
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-md text-pretty text-base text-muted-foreground md:text-lg">
          Fewer matches. Better connections. Real dates. No swiping, no endless chat — just a few
          people you are genuinely compatible with.
        </p>
        <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/login">
              Create my profile <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="#how">See how BOND works</Link>
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 mx-auto max-w-5xl scroll-mt-6 px-5 py-14">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-primary-light">
          How it works
        </p>
        <h2 className="mb-10 text-balance text-center text-2xl font-bold tracking-tight md:text-3xl">
          Three steps to a real date
        </h2>
        <ol className="grid gap-5 md:grid-cols-3">
          {[
            {
              icon: Sparkles,
              title: '1 · Build your AI profile',
              body: 'Answer a thoughtful questionnaire. BOND builds a deep compatibility profile — personality, values, ambitions and communication style.',
            },
            {
              icon: Heart,
              title: '2 · Receive selected proposals',
              body: 'No swiping. BOND surfaces a small, curated set of people you are truly compatible with — and explains exactly why.',
            },
            {
              icon: CalendarHeart,
              title: '3 · Agree on a real date',
              body: 'If interest is mutual, agree a time and let BOND suggest a venue that suits you both. The goal is meeting, not messaging.',
            },
          ].map((s) => (
            <li key={s.title} className="rounded-lg border border-border bg-surface p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-elevated text-primary-light">
                <s.icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Difference */}
      <section className="relative z-10 mx-auto max-w-5xl px-5 py-8">
        <div className="grid gap-5 md:grid-cols-2">
          <Feature
            icon={<Eye className="h-5 w-5" />}
            title="Transparent compatibility"
            body="Every proposal comes with a clear score and a plain-English breakdown across personality, values, life goals, communication and lifestyle. No black boxes."
          />
          <Feature
            icon={<MessageCircleOff className="h-5 w-5" />}
            title="No pre-date chat"
            body="Skip the small talk that goes nowhere. When you both say yes, BOND helps you agree a time and place — the conversation happens in person."
          />
          <Feature
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Safety by design"
            body="18+ only, report and block anytime, approximate distances, and a safety reminder before every date. Your home location is never exposed."
          />
          <Feature
            icon={<Lock className="h-5 w-5" />}
            title="Private by default"
            body="Your questionnaire answers and post-date feedback stay private. Others only ever see summarised compatibility insights — never your raw answers."
          />
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 mx-auto max-w-3xl px-5 py-16 text-center">
        <h2 className="text-balance text-3xl font-bold tracking-tight">
          Ready to meet someone who fits?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          Create your profile in minutes, or explore a fully seeded demo first.
        </p>
        <div className="mx-auto mt-7 flex max-w-sm flex-col gap-3">
          <Button asChild size="block">
            <Link href="/login">
              Create my profile <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-5 py-6 text-sm text-muted-foreground sm:flex-row safe-bottom">
          <span>© {new Date().getFullYear()} BOND</span>
          <nav className="flex gap-5" aria-label="Legal">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/safety" className="hover:text-foreground">
              Safety
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-elevated text-primary-light">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
