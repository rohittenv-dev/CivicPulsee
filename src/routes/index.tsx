import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  FileLock2,
  Gauge,
  MapPin,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";

import heroImage from "@/assets/civic-hero.jpg";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authority, authorityLine } from "@/config/authority";
import { lifecycleOrder, statusMeta } from "@/lib/lifecycle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: `${authority.productName} — Track civic complaints in ${authority.city}`,
      },
      {
        name: "description",
        content: `Report potholes, streetlights, garbage and water leaks to ${authority.authorityName} and watch every complaint move through a public, tamper-evident lifecycle.`,
      },
      {
        property: "og:title",
        content: `${authority.productName} — Civic issue reporting for ${authority.city}`,
      },
      {
        property: "og:description",
        content: `Every complaint gets a tracking ID and a visible lifecycle: reported, assigned, in progress, resolved, confirmed.`,
      },
    ],
  }),
  component: Landing,
});

const audiences = [
  {
    icon: Camera,
    eyebrow: "Citizens",
    title: "Report in under a minute",
    body: "Category, location, photo, one line of context. You get a tracking ID immediately and a notification at every single status change.",
    to: "/report",
    cta: "Report an issue",
  },
  {
    icon: Gauge,
    eyebrow: "Municipal officials",
    title: "A queue built for daily work",
    body: "Triage by urgency, category, age and location. Move issues through the lifecycle in one click and close them with photo proof.",
    to: "/official",
    cta: "Official sign in",
  },
  {
    icon: BadgeCheck,
    eyebrow: "Public & press",
    title: "Aggregate truth, zero PII",
    body: "City-wide resolution times, category breakdowns, geographic hotspots and department performance — auditable by anyone.",
    to: "/transparency",
    cta: "See city performance",
  },
] as const;

const differentiators = [
  {
    icon: ShieldAlert,
    title: "Smart triage from the photo",
    body: "The photo itself suggests the category and flags severity, so a downed live wire never waits behind a flickering bulb.",
  },
  {
    icon: FileLock2,
    title: "A history nobody can rewrite",
    body: "Every status change is hash-chained into a tamper-evident trail a skeptical journalist can verify line by line.",
  },
  {
    icon: MapPin,
    title: "Escalation without chasing",
    body: `Past ${authority.slaDays} days an issue escalates on its own — and helps you generate a formal follow-up request.`,
  },
  {
    icon: MessageSquare,
    title: "Works without an app",
    body: "A message-based intake path means reporting does not require a smartphone app or an account.",
  },
] as const;

function Landing() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border ink-wash">
          <div className="absolute inset-0 civic-grid opacity-70" aria-hidden />
          <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-24">
            <div>
              <p className="eyebrow">{authorityLine}</p>
              <h1 className="mt-4 text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
                Your complaint stops being
                <span className="block text-primary">a black box.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                File a civic issue with a photo and a location, get a real tracking ID in seconds,
                and watch it move — reported, assigned, in progress, resolved — with the whole city
                able to check the record.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link to="/report">
                    Report an issue
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/track" search={{ q: "" }}>Track an existing ID</Link>
                </Button>
              </div>

              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-border pt-6">
                <div>
                  <dt className="eyebrow">Resolution target</dt>
                  <dd className="mt-1 font-display text-2xl font-bold">
                    {authority.slaDays}
                    <span className="ml-1 text-sm font-medium text-muted-foreground">days</span>
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow">Time to report</dt>
                  <dd className="mt-1 font-display text-2xl font-bold">
                    &lt;60
                    <span className="ml-1 text-sm font-medium text-muted-foreground">sec</span>
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow">Status updates</dt>
                  <dd className="mt-1 font-display text-2xl font-bold">
                    Live
                    <span className="ml-1 text-sm font-medium text-muted-foreground">always</span>
                  </dd>
                </div>
              </dl>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-xl border border-border shadow-lift">
                <img
                  src={heroImage}
                  alt="A water-filled pothole on a city street at dusk with a municipal worker walking ahead"
                  width={1600}
                  height={1104}
                  className="h-full w-full object-cover"
                />
              </div>
              <Card className="absolute -bottom-6 left-4 right-4 border-border shadow-lift sm:left-8 sm:right-auto sm:w-80">
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="code-chip rounded-md bg-secondary px-2 py-1 text-secondary-foreground">
                    {authority.trackingPrefix}-7K3QD2
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">Pothole near Ganesh Chowk</p>
                    <p className="text-xs text-muted-foreground">Roads &amp; Transport · day 3</p>
                  </div>
                  <StatusBadge status="in_progress" size="sm" className="ml-auto shrink-0" />
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Lifecycle */}
        <section className="mx-auto w-full max-w-6xl px-4 py-20">
          <p className="eyebrow">The lifecycle</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold sm:text-4xl">
            Five states. All of them visible to you.
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            No silence, no guessing, no calling an office to ask whether anyone saw it. If the fix
            was not really done, you reopen it with a reason and it goes straight back to the
            department — without filing a new complaint.
          </p>

          <ol className="mt-10 grid gap-4 md:grid-cols-5">
            {lifecycleOrder.map((status, i) => (
              <li key={status}>
                <Card className="h-full border-border">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm font-bold text-muted-foreground">
                        0{i + 1}
                      </span>
                      <StatusBadge status={status} size="sm" />
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{statusMeta[status].blurb}</p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        </section>

        {/* Audiences */}
        <section className="border-y border-border bg-card">
          <div className="mx-auto w-full max-w-6xl px-4 py-20">
            <p className="eyebrow">Three views, one record</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-bold sm:text-4xl">
              Built for the citizen, the official, and everyone watching.
            </h2>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {audiences.map((a) => (
                <Card key={a.title} className="flex flex-col border-border">
                  <CardContent className="flex flex-1 flex-col p-6">
                    <span className="grid size-10 place-items-center rounded-md bg-secondary text-secondary-foreground">
                      <a.icon className="size-5" />
                    </span>
                    <p className="eyebrow mt-5">{a.eyebrow}</p>
                    <h3 className="mt-2 text-xl font-bold">{a.title}</h3>
                    <p className="mt-2 flex-1 text-sm text-muted-foreground">{a.body}</p>
                    <Button asChild variant="link" className="mt-4 self-start px-0">
                      <Link to={a.to}>
                        {a.cta}
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Differentiators */}
        <section className="mx-auto w-full max-w-6xl px-4 py-20">
          <p className="eyebrow">Why this is not a ticket tracker</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold sm:text-4xl">
            Accountability that holds up to scrutiny.
          </h2>

          <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {differentiators.map((d) => (
              <div key={d.title} className="flex gap-4 border-t border-border pt-6">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                  <d.icon className="size-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold">{d.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{d.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto w-full max-w-6xl px-4">
          <div className="relative overflow-hidden rounded-xl border border-border bg-primary px-6 py-14 text-center text-primary-foreground">
            <div className="absolute inset-0 civic-grid opacity-30" aria-hidden />
            <div className="relative">
              <h2 className="text-3xl font-bold sm:text-4xl">
                Something broken in your neighbourhood?
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">
                It takes less than a minute, and you will know exactly where it stands from the
                moment you press send.
              </p>
              <Button asChild size="lg" variant="secondary" className="mt-7">
                <Link to="/report">
                  Report it now
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
