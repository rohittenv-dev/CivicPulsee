import { Link } from "@tanstack/react-router";
import { authority, authorityLine } from "@/config/authority";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-card">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <p className="font-display text-lg font-bold">{authority.productName}</p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            A public accountability layer for {authorityLine}. Every complaint gets a tracking ID,
            a visible lifecycle, and a status history that cannot be quietly rewritten.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Helpline <span className="code-chip text-foreground">{authority.helpline}</span>
          </p>
        </div>

        <div>
          <p className="eyebrow">For citizens</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/report" className="hover:text-foreground">
                Report an issue
              </Link>
            </li>
            <li>
              <Link to="/track" search={{ q: "" }} className="hover:text-foreground">
                Track by ID
              </Link>
            </li>
            <li>
              <Link to="/map" className="hover:text-foreground">
                Live issue map
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="eyebrow">Oversight</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/transparency" className="hover:text-foreground">
                City performance
              </Link>
            </li>
            <li>
              <Link to="/official" className="hover:text-foreground">
                Official sign in
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        Service target: {authority.slaDays} days to resolution. Overdue issues escalate
        automatically.
      </div>
    </footer>
  );
}
