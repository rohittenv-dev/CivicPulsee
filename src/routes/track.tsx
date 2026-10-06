import { useState, useEffect, useMemo } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { authority, departments } from "@/config/authority";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import {
  fetchAllIssues,
  fetchIssueEvents,
  updateIssueStatus,
  type IssueItem,
  type IssueEventItem,
} from "@/lib/services/issue-service";
import { isDisplayablePhoto } from "@/lib/services/photo-upload";
import { useAuth } from "@/lib/auth/auth-context";
import { AuthDialog } from "@/components/auth/auth-dialog";
import { toast } from "sonner";
import {
  Search,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  MapPin,
  Calendar,
  FileCheck2,
  ChevronRight,
  Lock,
  ArrowLeft,
} from "lucide-react";

export const Route = createFileRoute("/track")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search["q"] === "string" ? search["q"] : "",
  }),
  head: () => ({
    meta: [
      { title: `Track a complaint — ${authority.productName}` },
      {
        name: "description",
        content: `Browse every civic complaint in ${authority.city} or search by ${authority.trackingPrefix} tracking ID, title or location to see its tamper-evident status history.`,
      },
      { property: "og:title", content: `Track a civic complaint — ${authority.productName}` },
      {
        property: "og:description",
        content: "Search by tracking ID, title or location and follow every status change with its audit hash.",
      },
    ],
  }),
  component: TrackPage,
});

export function TrackPage() {
  const search = useSearch({ from: "/track" });
  const { user } = useAuth();

  const [query, setQuery] = useState(search["q"] || "");
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<IssueItem | null>(null);
  const [events, setEvents] = useState<IssueEventItem[]>([]);
  const [reopenReason, setReopenReason] = useState("");
  const [showReopenBox, setShowReopenBox] = useState(false);
  const [working, setWorking] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setIssues(await fetchAllIssues());
    } catch {
      toast.error("Could not load complaints. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // A tracking ID in the URL (e.g. straight after filing) opens that case.
  useEffect(() => {
    const q = search["q"];
    if (!q || issues.length === 0) return;
    setQuery(q);
    const hit = issues.find((i) => i.tracking_id.toUpperCase() === q.trim().toUpperCase());
    if (hit) openIssue(hit);
  }, [search["q"], issues.length]);

  // Empty box = every case. Typing only narrows: ID, title or location.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return issues;
    return issues.filter(
      (i) =>
        i.tracking_id.toLowerCase().includes(q) ||
        i.title.toLowerCase().includes(q) ||
        (i.address ?? "").toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
    );
  }, [issues, query]);

  const openIssue = async (issue: IssueItem) => {
    setSelected(issue);
    setShowReopenBox(false);
    setReopenReason("");
    setEvents(await fetchIssueEvents(issue.id));
  };

  /**
   * Ownership: only the mobile number that filed the complaint may confirm or
   * reopen it. Municipal staff do the municipal work; they can never close a
   * citizen's case on the citizen's behalf.
   */
  const isReporter =
    !!selected && !!user?.phone && user.role === "citizen" && user.phone === selected.reporter_phone;

  const applyCitizenDecision = async (status: "confirmed" | "reopened", note: string) => {
    if (!selected) return;
    setWorking(true);
    try {
      const updated = await updateIssueStatus(selected.id, status, note, undefined, user?.name);
      if (updated) {
        setSelected(updated);
        setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
        setEvents(await fetchIssueEvents(updated.id));
        if (status === "confirmed") toast.success("Thank you! Complaint marked as Confirmed & Closed.");
        else toast.warning("Complaint reopened and routed back to the department queue.");
      }
    } catch {
      toast.error("Could not update the complaint. Please try again.");
    } finally {
      setWorking(false);
      setShowReopenBox(false);
      setReopenReason("");
    }
  };

  const deptName =
    departments.find((d) => d.slug === selected?.department_id)?.name || "Municipal Engineering";

  return (
    <PageShell
      eyebrow="Public Lookup"
      title="Track complaints"
      lede={`Every complaint in ${authority.city} is listed below. Search by ${authority.trackingPrefix} code, title or location to narrow it down.`}
      width="wide"
    >
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search by ID (${authority.trackingPrefix}-7K3QD2), title or location…`}
            className="pl-10 text-base"
          />
        </div>

        {selected ? (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setSelected(null)}>
              <ArrowLeft className="size-4" /> Back to all complaints
            </Button>

            <Card className="border-border bg-card shadow-lift overflow-hidden">
              <CardHeader className="border-b border-border bg-secondary/30 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold tracking-wider text-primary">
                      {selected.tracking_id}
                    </span>
                    <Badge variant="outline" className="capitalize text-xs font-mono">
                      {selected.category}
                    </Badge>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>
                <CardTitle className="font-display text-xl font-semibold mt-2">{selected.title}</CardTitle>
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" /> {selected.address ?? "Location on map"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3.5" /> Reported{" "}
                    {new Date(selected.created_at).toLocaleDateString()}
                  </span>
                  <span>Dept: {deptName}</span>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <h4 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Citizen Complaint Details
                    </h4>
                    <p className="text-sm text-foreground">{selected.description}</p>
                    <div className="mt-3 text-xs text-muted-foreground">
                      Citizen Voices Supporting:{" "}
                      <strong className="text-foreground">{selected.support_count}</strong>
                    </div>
                  </div>

                  {isDisplayablePhoto(selected.photo_url) && (
                    <div>
                      <h4 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                        Before
                      </h4>
                      <img
                        src={selected.photo_url!}
                        alt={`Before photo of ${selected.title}`}
                        loading="lazy"
                        className="h-32 w-full object-cover rounded-lg border border-border"
                      />
                    </div>
                  )}
                </div>

                {(selected.status === "resolved" || selected.status === "confirmed") && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="size-4" /> After
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {selected.resolved_at ? new Date(selected.resolved_at).toLocaleDateString() : ""}
                      </span>
                    </div>

                    {selected.resolution_notes && (
                      <div className="rounded-md bg-emerald-500/10 p-2.5 border border-emerald-500/20">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-0.5">
                          Resolution Notes
                        </p>
                        <p className="text-xs text-foreground italic">"{selected.resolution_notes}"</p>
                      </div>
                    )}

                    {isDisplayablePhoto(selected.proof_photo_url) && (
                      <div>
                        <img
                          src={selected.proof_photo_url!}
                          alt={`After photo proof of work for ${selected.tracking_id}`}
                          loading="lazy"
                          className="mt-1 h-44 w-full max-w-md object-cover rounded-lg border-2 border-emerald-500/40 shadow-sm"
                        />
                      </div>
                    )}

                    {selected.status === "resolved" && (
                      <div className="pt-2">
                        {isReporter ? (
                          <>
                            <div className="flex flex-wrap items-center gap-3">
                              <Button
                                size="sm"
                                disabled={working}
                                onClick={() => applyCitizenDecision("confirmed", "Confirmed by the reporting citizen")}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                              >
                                <FileCheck2 className="size-4" /> Confirm & Close
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowReopenBox(!showReopenBox)}
                                className="gap-1.5"
                              >
                                <RotateCcw className="size-4" /> Reopen Complaint
                              </Button>
                            </div>

                            {showReopenBox && (
                              <div className="pt-3 space-y-2 border-t border-border mt-3">
                                <Textarea
                                  placeholder="Why is this issue still unresolved? (e.g. Pothole was only partially filled)"
                                  value={reopenReason}
                                  onChange={(e) => setReopenReason(e.target.value)}
                                  rows={2}
                                />
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={working}
                                  onClick={() => {
                                    if (!reopenReason.trim()) {
                                      toast.error("Please give a reason for reopening this complaint.");
                                      return;
                                    }
                                    applyCitizenDecision("reopened", reopenReason);
                                  }}
                                >
                                  Submit Reopen Request
                                </Button>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card/60 px-3 py-2 text-xs text-muted-foreground">
                            <Lock className="size-3.5 shrink-0" />
                            <span>
                              Only the citizen who filed {selected.tracking_id} can confirm or reopen it.
                              {user ? "" : " Sign in with that mobile number if it's yours."}
                            </span>
                            {!user && <AuthDialog trigger={<Button size="sm" variant="outline">Sign in</Button>} />}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Real audit chain from issue_events */}
                <div className="rounded-lg border border-border bg-secondary/20 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <ShieldCheck className="size-4 text-primary" /> Tamper-Evident Audit Trail
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">SHA-256 Hash Chain</span>
                  </div>
                  {events.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No recorded events yet.</p>
                  ) : (
                    <ol className="space-y-2">
                      {events.map((ev) => (
                        <li
                          key={ev.id}
                          className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2 last:border-0 last:pb-0"
                        >
                          <span className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground capitalize">
                              {(ev.previous_status ?? "new").replace("_", " ")}
                            </span>
                            <ChevronRight className="size-3 text-muted-foreground" />
                            <span className="font-medium capitalize">{ev.new_status.replace("_", " ")}</span>
                            <span className="text-muted-foreground">
                              · {new Date(ev.created_at).toLocaleString()}
                              {ev.actor_name ? ` · ${ev.actor_name}` : ""}
                            </span>
                          </span>
                          <span className="font-mono text-[10px] text-primary truncate max-w-[180px]">
                            {ev.event_hash.slice(0, 32)}…
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {loading ? "Loading complaints…" : `${results.length} complaint${results.length === 1 ? "" : "s"}`}
              </span>
              {query && (
                <button className="underline hover:text-foreground" onClick={() => setQuery("")}>
                  Clear search
                </button>
              )}
            </div>

            {!loading && results.length === 0 && (
              <Card className="border-border bg-card p-8 text-center text-sm text-muted-foreground">
                No complaint matches “{query}”. Try a different ID, title or locality.
              </Card>
            )}

            <div className="grid gap-3">
              {results.map((issue) => (
                <button
                  key={issue.id}
                  onClick={() => openIssue(issue)}
                  className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-secondary/40"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-primary">{issue.tracking_id}</span>
                      <StatusBadge status={issue.status} />
                      <Badge variant="outline" className="text-[10px] capitalize font-mono">
                        {issue.category}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate font-display text-sm font-semibold">{issue.title}</p>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <MapPin className="size-3 shrink-0" /> {issue.address ?? "Location on map"}
                    </p>
                  </div>
                  <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
