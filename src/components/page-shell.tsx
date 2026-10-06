import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/**
 * Standard page frame for every non-landing route so the three experiences stay
 * visually consistent without duplicating shell markup.
 */
export function PageShell({
  eyebrow,
  title,
  lede,
  actions,
  children,
  width = "default",
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  actions?: ReactNode;
  children?: ReactNode;
  width?: "default" | "wide";
}) {
  const max = width === "wide" ? "max-w-7xl" : "max-w-4xl";
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="border-b border-border ink-wash">
          <div className={`mx-auto w-full ${max} px-4 py-12`}>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
                {lede ? <p className="mt-3 max-w-2xl text-muted-foreground">{lede}</p> : null}
              </div>
              {actions}
            </div>
          </div>
        </div>
        <div className={`mx-auto w-full ${max} px-4 py-10`}>{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function PhaseNotice({ phase, items }: { phase: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-6">
      <p className="eyebrow">{phase}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        This screen is scaffolded and lands fully wired in the next delivery phase. It will include:
      </p>
      <ul className="mt-4 grid gap-2 text-sm">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
