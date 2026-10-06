import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { LogOut, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "@/components/auth/auth-dialog";
import { useAuth } from "@/lib/auth/auth-context";
import { departments } from "@/config/authority";
import { toast } from "sonner";

export function AccountMenu() {
  const { user, ready, signOut, isOfficial } = useAuth();
  const [openMenu, setOpenMenu] = useState(false);

  if (!ready) return <div className="h-8 w-20" aria-hidden />;
  if (!user) return <AuthDialog />;

  const deptName =
    user.department === "all"
      ? "All departments"
      : departments.find((d) => d.slug === user.department)?.name;

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setOpenMenu((v) => !v)}
        aria-expanded={openMenu}
      >
        {isOfficial ? <ShieldCheck className="size-4 text-primary" /> : <User className="size-4" />}
        <span className="max-w-[9rem] truncate">{user.name}</span>
      </Button>

      {openMenu && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-border bg-card p-3 shadow-lift">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isOfficial ? "Municipal official" : "Citizen"}
          </p>
          <p className="mt-1 text-sm font-medium">{user.name}</p>
          {isOfficial ? (
            <p className="text-xs text-muted-foreground">
              <span className="font-mono">{user.employeeCode}</span> · {user.designation}
              {deptName ? ` · ${deptName}` : ""}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Can report issues, add voice, confirm or reopen fixes.
            </p>
          )}

          <div className="mt-3 grid gap-1.5">
            {isOfficial && (
              <Button asChild size="sm" variant="secondary" className="justify-start">
                <Link to="/official" onClick={() => setOpenMenu(false)}>
                  Open triage queue
                </Link>
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="justify-start gap-2 text-destructive"
              onClick={() => {
                signOut();
                setOpenMenu(false);
                toast.success("Signed out");
              }}
            >
              <LogOut className="size-4" /> Sign out
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
