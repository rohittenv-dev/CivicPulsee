import { useEffect, useMemo, useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { authority, categories, departments } from "@/config/authority";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { fetchAllIssues, type IssueItem } from "@/lib/services/issue-service";
import { lifecycleOrder, statusMeta, type IssueStatus } from "@/lib/lifecycle";
import {
  Loader2,
  TrendingUp,
  Clock,
  CheckCircle2,
  FileWarning,
  MapPin,
  RefreshCcw,
  BarChart3,
  Calendar,
  Layers,
  Users,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";

export const Route = createFileRoute("/transparency")({
  head: () => ({
    meta: [
      { title: `${authority.city} civic performance — ${authority.productName}` },
      {
        name: "description",
        content: `Public accountability dashboard for ${authority.authorityName}: resolution times, category breakdowns, hotspots and department performance.`,
      },
      { property: "og:title", content: `${authority.city} civic performance dashboard` },
      {
        property: "og:description",
        content: "Aggregate resolution data for the whole city, with zero personal information.",
      },
    ],
  }),
  component: TransparencyPage,
});

const DAY = 86400000;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? (s[mid] ?? 0) : ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2;
}

const STATUS_COLORS: Record<string, string> = {
  reported: "#dc2626",
  assigned: "#d97706",
  in_progress: "#d97706",
  reopened: "#db2777",
  resolved: "#059669",
  confirmed: "#0f766e",
};

export function TransparencyPage() {
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);

  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await fetchAllIssues();
      setIssues(data);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const total = issues.length;
    const closedStatuses: IssueStatus[] = ["resolved", "confirmed"];
    const closed = issues.filter((i) => closedStatuses.includes(i.status));
    const open = issues.filter((i) => !closedStatuses.includes(i.status));

    // Real resolution duration calculation (resolved_at - created_at)
    const resolutionDays = closed
      .filter((i) => i.resolved_at)
      .map((i) => (new Date(i.resolved_at!).getTime() - new Date(i.created_at).getTime()) / DAY);

    const withinSla = resolutionDays.filter((d) => d <= authority.slaDays).length;

    // Real status breakdown
    const byStatus = lifecycleOrder.map((status: IssueStatus) => ({
      status,
      label: statusMeta[status]?.label ?? status,
      count: issues.filter((i) => i.status === status).length,
      color: STATUS_COLORS[status] ?? "#475569",
    }));

    // Real category breakdown
    const byCategory = categories
      .map((c) => ({
        slug: c.slug,
        label: c.label.split("/")[0]?.trim() ?? c.label,
        count: issues.filter((i) => i.category === c.slug).length,
      }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count);

    // Real department breakdown
    const byDepartment = departments
      .map((d) => {
        const rows = issues.filter((i) => i.department_id === d.slug);
        const done = rows.filter((i) => closedStatuses.includes(i.status));
        const days = done
          .filter((i) => i.resolved_at)
          .map((i) => (new Date(i.resolved_at!).getTime() - new Date(i.created_at).getTime()) / DAY);
        return {
          slug: d.slug,
          name: d.name,
          total: rows.length,
          open: rows.length - done.length,
          medianDays: median(days),
          rate: rows.length ? Math.round((done.length / rows.length) * 100) : 0,
        };
      })
      .filter((d) => d.total > 0)
      .sort((a, b) => b.total - a.total);

    // Real geographic hotspot aggregation
    const hotspotMap = new Map<string, number>();
    for (const i of issues) {
      const key = (i.address ?? "Unmapped area").split(",").slice(0, 2).join(",").trim();
      hotspotMap.set(key, (hotspotMap.get(key) ?? 0) + 1);
    }
    const hotspots = [...hotspotMap.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Real backlog age in days
    const backlogAgeDays = open.map((i) => (Date.now() - new Date(i.created_at).getTime()) / DAY);

    // Real time-series intake (grouped by created_at date)
    const intakeByDateMap = new Map<string, number>();
    const sortedIssues = [...issues].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    sortedIssues.forEach((i) => {
      const d = new Date(i.created_at);
      const dateKey = d.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      });
      intakeByDateMap.set(dateKey, (intakeByDateMap.get(dateKey) ?? 0) + 1);
    });
    const timeSeries = [...intakeByDateMap.entries()].map(([date, count]) => ({
      date,
      complaints: count,
    }));

    return {
      total,
      openCount: open.length,
      closedCount: closed.length,
      medianResolution: median(resolutionDays),
      slaCompliance: resolutionDays.length ? Math.round((withinSla / resolutionDays.length) * 100) : 0,
      resolutionRate: total ? Math.round((closed.length / total) * 100) : 0,
      oldestOpen: backlogAgeDays.length ? Math.max(...backlogAgeDays) : 0,
      totalVoices: issues.reduce((sum, i) => sum + (i.support_count ?? 1), 0),
      byStatus,
      byCategory,
      byDepartment,
      hotspots,
      timeSeries,
    };
  }, [issues]);

  if (loading) {
    return (
      <PageShell eyebrow="Public & press" title="City performance" lede="Loading city-wide figures…" width="wide">
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" /> Aggregating real complaint data from Supabase…
        </div>
      </PageShell>
    );
  }

  const maxCategory = stats.byCategory[0]?.count ?? 1;
  const maxHotspot = stats.hotspots[0]?.count ?? 1;

  return (
    <PageShell
      eyebrow="Public & press"
      title="City performance"
      lede={`Real-time civic intelligence for ${authority.authorityName}. All metrics are calculated live from verified database records.`}
      width="wide"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="gap-2 h-8 text-xs shadow-sm"
        >
          <RefreshCcw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing…" : "Refresh Data"}
        </Button>
      }
    >
      {failed ? (
        <Card className="border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-destructive space-y-3">
          <p className="font-semibold">Unable to fetch live analytics from Supabase.</p>
          <p className="text-xs text-muted-foreground">Please check your database connectivity and refresh.</p>
          <Button variant="outline" size="sm" onClick={() => loadData(true)} className="gap-2">
            <RefreshCcw className="size-3.5" /> Try again
          </Button>
        </Card>
      ) : (
        <div className="space-y-10">
          {/* Headline metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Total complaints",
                value: stats.total,
                icon: <FileWarning className="size-4 text-primary" />,
                note: `${stats.totalVoices} citizen endorsements`,
              },
              {
                label: "Open backlog",
                value: stats.openCount,
                icon: <Clock className="size-4 text-amber-500" />,
                note: stats.openCount > 0 ? `Oldest open: ${Math.round(stats.oldestOpen)} days` : "No open issues",
              },
              {
                label: "Median resolution",
                value: `${stats.medianResolution.toFixed(1)}d`,
                icon: <TrendingUp className="size-4 text-emerald-500" />,
                note: `SLA target ${authority.slaDays} days`,
              },
              {
                label: "Resolution rate",
                value: `${stats.resolutionRate}%`,
                icon: <CheckCircle2 className="size-4 text-teal-500" />,
                note: `${stats.slaCompliance}% inside SLA`,
              },
            ].map((m) => (
              <Card key={m.label} className="border-border bg-card p-5 shadow-card">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {m.icon} {m.label}
                </div>
                <div className="mt-2 font-display text-3xl font-bold text-foreground tabular-nums">{m.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{m.note}</div>
              </Card>
            ))}
          </div>

          {/* Time Series Intake Chart (Dynamic from real created_at) */}
          {stats.timeSeries.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold flex items-center gap-2">
                  <Calendar className="size-4 text-primary" /> Complaint Intake Over Time
                </h2>
                <span className="text-xs text-muted-foreground">Derived from real filing timestamps</span>
              </div>
              <Card className="border-border bg-card p-5 shadow-card">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.timeSeries} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="intakeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="oklch(0.42 0.078 203)" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="oklch(0.42 0.078 203)" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          borderColor: "var(--border)",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="complaints"
                        stroke="oklch(0.42 0.078 203)"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#intakeGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </section>
          )}

          {/* Lifecycle distribution */}
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <Layers className="size-4 text-primary" /> Lifecycle Distribution
            </h2>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {stats.byStatus.map((s) => (
                <Card key={s.status} className="border-border bg-card p-4 shadow-card">
                  <StatusBadge status={s.status} />
                  <div className="mt-2 font-display text-2xl font-bold tabular-nums">{s.count}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    {stats.total > 0 ? Math.round((s.count / stats.total) * 100) : 0}% of total
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Category + hotspots */}
          <section className="grid gap-6 lg:grid-cols-2">
            {/* Real Category distribution */}
            <div className="space-y-3">
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <BarChart3 className="size-4 text-primary" /> Complaints by Category
              </h2>
              <Card className="border-border bg-card p-5 shadow-card">
                {stats.byCategory.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No complaints recorded yet.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.byCategory} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "var(--card)",
                              borderColor: "var(--border)",
                              borderRadius: "8px",
                              fontSize: "12px",
                            }}
                          />
                          <Bar dataKey="count" fill="oklch(0.42 0.078 203)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <ul className="space-y-2.5 pt-2 border-t border-border">
                      {stats.byCategory.map((c) => (
                        <li key={c.label} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium">{c.label}</span>
                            <span className="text-muted-foreground font-semibold tabular-nums">{c.count}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full bg-primary transition-all duration-300"
                              style={{ width: `${(c.count / maxCategory) * 100}%` }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            </div>

            {/* Real Geographic Hotspots */}
            <div className="space-y-3">
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <MapPin className="size-4 text-amber-500" /> Geographic Hotspots
              </h2>
              <Card className="border-border bg-card p-5 shadow-card">
                {stats.hotspots.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No mapped locations recorded yet.</p>
                ) : (
                  <ul className="space-y-3.5">
                    {stats.hotspots.map((h) => (
                      <li key={h.label} className="space-y-1">
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="flex min-w-0 items-center gap-1.5 font-medium">
                            <MapPin className="size-3.5 shrink-0 text-amber-500" />
                            <span className="truncate">{h.label}</span>
                          </span>
                          <span className="text-muted-foreground font-semibold tabular-nums">{h.count} issues</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-amber-500 transition-all duration-300"
                            style={{ width: `${(h.count / maxHotspot) * 100}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </section>

          {/* Real Department Performance */}
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <Users className="size-4 text-teal-600" /> Department Performance
            </h2>
            <Card className="overflow-hidden border-border bg-card shadow-card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Department</th>
                      <th className="px-4 py-3 font-semibold text-center">Total</th>
                      <th className="px-4 py-3 font-semibold text-center">Open</th>
                      <th className="px-4 py-3 font-semibold text-center">Median Resolution</th>
                      <th className="px-4 py-3 font-semibold text-right">Closed Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byDepartment.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                          No department activity recorded in database yet.
                        </td>
                      </tr>
                    ) : (
                      stats.byDepartment.map((d) => (
                        <tr key={d.name} className="border-t border-border hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-3 font-medium">{d.name}</td>
                          <td className="px-4 py-3 text-center tabular-nums">{d.total}</td>
                          <td className="px-4 py-3 text-center tabular-nums text-amber-600 font-semibold">{d.open}</td>
                          <td className="px-4 py-3 text-center tabular-nums">
                            {d.medianDays > 0 ? `${d.medianDays.toFixed(1)} days` : "—"}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-600">
                            {d.rate}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
            <p className="text-xs text-muted-foreground">
              Figures are computed live from every verified complaint on record. Helpline: {authority.helpline}.
            </p>
          </section>
        </div>
      )}
    </PageShell>
  );
}

