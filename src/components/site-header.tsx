import { Link } from "@tanstack/react-router";
import { Activity, Menu } from "lucide-react";
import { authority } from "@/config/authority";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { AccountMenu } from "@/components/auth/account-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth/auth-context";

const publicNav = [
  { to: "/report", label: "Report an issue" },
  { to: "/map", label: "Live map" },
  { to: "/track", label: "Track complaints" },
  { to: "/transparency", label: "Transparency" },
];

/** The official queue is invisible to citizens — staff only, no locked teaser. */
const officialNav = { to: "/official", label: "Official queue" };

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
        <Activity className="size-5" strokeWidth={2.4} />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-base font-bold tracking-tight">
          {authority.productName}
        </span>
        <span className="block text-[0.6875rem] text-muted-foreground">
          {authority.authorityShortName} · {authority.city}
        </span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const { isOfficial } = useAuth();
  const nav = isOfficial ? [...publicNav, officialNav] : publicNav;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Brand />

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: "bg-secondary text-secondary-foreground" }}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <AccountMenu />
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link to="/report">Report an issue</Link>
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="font-display">{authority.productName}</SheetTitle>
              </SheetHeader>
              <nav className="mt-4 grid gap-1">
                {nav.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
