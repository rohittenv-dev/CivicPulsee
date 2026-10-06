import {
  useState,
  useEffect,
  useMemo,
  lazy,
  Suspense,
  useCallback,
  useRef,
} from "react";
import { createFileRoute, Link, ClientOnly } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { StatusBadge } from "@/components/status-badge";
import { authority, categories } from "@/config/authority";
import { fetchAllIssues, type IssueItem } from "@/lib/services/issue-service";
import { issueStatuses, statusMeta, type IssueStatus } from "@/lib/lifecycle";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MapPin,
  ArrowRight,
  Navigation,
  Calendar,
  Layers,
  Search,
  X,
  TriangleAlert,
  Lightbulb,
  Trash2,
  Droplets,
  Waves,
  Zap,
  Fence,
  CircleHelp,
  LocateFixed,
  List,
  ChevronDown,
  ChevronUp,
  RefreshCcw,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CivicMap = lazy(() => import("@/components/map/civic-map"));

/** Geographic centre of the authority's jurisdiction. */
const CITY_CENTER: [number, number] = [authority.centre.lat, authority.centre.lng];

/* ─── Category icon map (matches authority.ts icon names) ─── */
const CAT_ICONS: Record<string, React.ReactNode> = {
  pothole: <TriangleAlert className="size-3.5" />,
  streetlight: <Lightbulb className="size-3.5" />,
  garbage: <Trash2 className="size-3.5" />,
  water_leak: <Droplets className="size-3.5" />,
  drainage: <Waves className="size-3.5" />,
  live_wire: <Zap className="size-3.5" />,
  encroachment: <Fence className="size-3.5" />,
  other: <CircleHelp className="size-3.5" />,
};

const CAT_COLOR: Record<string, string> = {
  pothole: "#b45309",
  streetlight: "#ca8a04",
  garbage: "#16a34a",
  water_leak: "#0284c7",
  drainage: "#0369a1",
  live_wire: "#dc2626",
  encroachment: "#7c3aed",
  other: "#475569",
};

const STATUS_ALL_FILTER = [
  "all",
  ...issueStatuses,
] as const;

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: `Live issue map — ${authority.city} | ${authority.productName}` },
      {
        name: "description",
        content: `See open, in-progress and resolved civic issues across ${authority.city} on a live status-coded map.`,
      },
      { property: "og:title", content: `Live civic issue map — ${authority.city}` },
      {
        property: "og:description",
        content: `Every complaint filed with ${authority.authorityName}, plotted and colour-coded by status.`,
      },
    ],
  }),
  component: MapPage,
});

function MapSkeleton() {
  return (
    <div className="flex h-full min-h-[480px] items-center justify-center rounded-2xl border border-border bg-secondary/40 text-xs text-muted-foreground">
      <span className="flex items-center gap-2">
        <Layers className="size-4 animate-pulse" /> Loading {authority.city} basemap…
      </span>
    </div>
  );
}

function MapErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-full min-h-[480px] flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-secondary/40 text-center">
      <AlertCircle className="size-8 text-muted-foreground" />
      <p className="text-sm font-semibold">Map temporarily unavailable</p>
      <p className="text-xs text-muted-foreground">Tiles failed to load. Check your connection.</p>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-2 mt-1">
        <RefreshCcw className="size-3.5" /> Try again
      </Button>
    </div>
  );
}

/* ─── Stats bar ─── */
function StatsBar({ issues }: { issues: IssueItem[] }) {
  const total = issues.length;
  const active = issues.filter(
    (i) => i.status === "reported" || i.status === "assigned" || i.status === "in_progress" || i.status === "reopened"
  ).length;
  const resolved = issues.filter(
    (i) => i.status === "resolved" || i.status === "confirmed"
  ).length;
  const inProgress = issues.filter((i) => i.status === "in_progress").length;

  const stats = [
    { label: "Total Issues", value: total, colorClass: "text-foreground" },
    { label: "Active", value: active, colorClass: "text-pending" },
    { label: "In Progress", value: inProgress, colorClass: "text-progress" },
    { label: "Resolved", value: resolved, colorClass: "text-resolved" },
  ];

  return (
    <div className="grid grid-cols-4 divide-x divide-border rounded-xl border border-border bg-card shadow-card">
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col items-center px-4 py-3 text-center">
          <span className={cn("text-xl font-bold font-display tabular-nums", s.colorClass)}>
            {s.value}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground mt-0.5 leading-tight">
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Category filter pills ─── */
function CategoryFilters({
  activeCategory,
  onChange,
  issues,
}: {
  activeCategory: string;
  onChange: (slug: string) => void;
  issues: IssueItem[];
}) {
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: issues.length };
    issues.forEach((i) => {
      c[i.category] = (c[i.category] ?? 0) + 1;
    });
    return c;
  }, [issues]);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        id="filter-cat-all"
        onClick={() => onChange("all")}
        className={cn(
          "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-all",
          activeCategory === "all"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-secondary text-muted-foreground hover:bg-secondary/70"
        )}
      >
        All
        <span className="opacity-70 text-[10px]">({counts['all']})</span>
      </button>
      {categories.map((cat) => {
        const count = counts[cat.slug] ?? 0;
        const isActive = activeCategory === cat.slug;
        const color = CAT_COLOR[cat.slug] ?? "#475569";
        return (
          <button
            id={`filter-cat-${cat.slug}`}
            key={cat.slug}
            onClick={() => onChange(cat.slug)}
            style={
              isActive
                ? { background: color, color: "#fff", borderColor: color }
                : {}
            }
            className={cn(
              "flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-all",
              isActive
                ? "shadow-sm"
                : "border-border bg-secondary text-muted-foreground hover:bg-secondary/70"
            )}
          >
            <span className={isActive ? "text-white/80" : ""} style={isActive ? {} : { color }}>
              {CAT_ICONS[cat.slug]}
            </span>
            {cat.label.split("/")[0]?.trim()}
            {count > 0 && (
              <span className={cn("text-[10px]", isActive ? "opacity-80" : "opacity-60")}>
                ({count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Status filters ─── */
function StatusFilters({
  activeStatus,
  onChange,
  issues,
}: {
  activeStatus: string;
  onChange: (s: string) => void;
  issues: IssueItem[];
}) {
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: issues.length };
    issues.forEach((i) => {
      c[i.status] = (c[i.status] ?? 0) + 1;
    });
    return c;
  }, [issues]);

  return (
    <div className="flex flex-wrap gap-1.5">
      {STATUS_ALL_FILTER.map((s) => {
        const isActive = activeStatus === s;
        const meta = s === "all" ? null : statusMeta[s as IssueStatus];
        return (
          <button
            id={`filter-status-${s}`}
            key={s}
            onClick={() => onChange(s)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-all border",
              isActive
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "border-border bg-secondary text-muted-foreground hover:bg-secondary/70"
            )}
          >
            {meta ? meta.label : "All"}
            {(counts[s] ?? 0) > 0 && (
              <span className="ml-1 opacity-60 text-[10px]">({counts[s] ?? 0})</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Issue list item ─── */
function IssueListItem({
  issue,
  isSelected,
  onSelect,
}: {
  issue: IssueItem;
  isSelected: boolean;
  onSelect: (i: IssueItem) => void;
}) {
  const color = CAT_COLOR[issue.category] ?? "#475569";
  const catLabelText =
    categories.find((c) => c.slug === issue.category)?.label?.split("/")[0]?.trim() ?? issue.category;

  return (
    <button
      id={`issue-list-item-${issue.id}`}
      onClick={() => onSelect(issue)}
      className={cn(
        "w-full rounded-lg border px-3 py-2.5 text-left transition-all hover:shadow-sm",
        isSelected
          ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
          : "border-border bg-card hover:bg-secondary/40"
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full"
          style={{ background: color + "18", color }}
        >
          {CAT_ICONS[issue.category] ?? <CircleHelp className="size-3" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold leading-tight">{issue.title}</p>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {issue.address ?? `${issue.latitude.toFixed(4)}, ${issue.longitude.toFixed(4)}`}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span
              className="text-[9px] font-bold uppercase tracking-wide"
              style={{ color }}
            >
              {catLabelText}
            </span>
            <span className="text-[9px] text-muted-foreground">·</span>
            <StatusBadge status={issue.status as IssueStatus} size="sm" />
          </div>
        </div>
      </div>
    </button>
  );
}

/* ─── Issue inspector panel (right side) ─── */
function IssueInspector({ issue }: { issue: IssueItem | null }) {
  if (!issue) {
    return (
      <Card className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 border-border bg-card p-6 text-center text-muted-foreground">
        <MapPin className="size-8 opacity-25" />
        <p className="text-sm font-medium">Select a marker</p>
        <p className="text-xs opacity-70">Click any map pin to inspect issue details.</p>
      </Card>
    );
  }

  const catLabelText = categories.find((c) => c.slug === issue.category)?.label ?? issue.category;
  const color = CAT_COLOR[issue.category] ?? "#475569";

  return (
    <Card className="space-y-4 border-border bg-card p-5 shadow-lift">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{ background: color + "18", color }}
          >
            {CAT_ICONS[issue.category]}
            {catLabelText.split("/")[0]?.trim()}
          </span>
          <p className="mt-1 font-mono text-xs font-bold text-primary">{issue.tracking_id}</p>
        </div>
        <StatusBadge status={issue.status as IssueStatus} />
      </div>

      {/* Title + description */}
      <div>
        <h3 className="font-display text-base font-bold leading-tight">{issue.title}</h3>
        {issue.description && (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-3">
            {issue.description}
          </p>
        )}
      </div>

      {/* Photos: Before and After */}
      {(issue.photo_url || issue.proof_photo_url) && (
        <div className="space-y-2">
          {issue.photo_url && issue.proof_photo_url ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Before
                </span>
                <img
                  src={issue.photo_url}
                  alt={`Before - ${issue.title}`}
                  className="h-28 w-full rounded-lg border border-border object-cover"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  After
                </span>
                <img
                  src={issue.proof_photo_url}
                  alt={`After - ${issue.title}`}
                  className="h-28 w-full rounded-lg border-2 border-emerald-500 object-cover shadow-sm"
                />
              </div>
            </div>
          ) : issue.photo_url ? (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Before
              </span>
              <img
                src={issue.photo_url}
                alt={`Reported issue at ${issue.address ?? authority.city}`}
                className="h-36 w-full rounded-lg border border-border object-cover"
              />
            </div>
          ) : (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                After
              </span>
              <img
                src={issue.proof_photo_url!}
                alt={`Resolution proof for ${issue.title}`}
                className="h-36 w-full rounded-lg border-2 border-emerald-500 object-cover shadow-sm"
              />
            </div>
          )}
        </div>
      )}

      {/* Resolution Notes */}
      {issue.resolution_notes && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Resolution Notes
          </p>
          <p className="text-xs text-foreground italic leading-relaxed">
            "{issue.resolution_notes}"
          </p>
        </div>
      )}

      {/* Meta */}
      <div className="space-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
        {issue.address && (
          <div className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-foreground" />
            <span className="line-clamp-2">{issue.address}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Calendar className="size-3.5 shrink-0 text-foreground" />
          <span>
            Reported{" "}
            {new Date(issue.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Navigation className="size-3.5 shrink-0 text-foreground" />
          <span>
            {issue.latitude.toFixed(5)}, {issue.longitude.toFixed(5)}
          </span>
        </div>
        {issue.support_count > 1 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-primary">
              👍 {issue.support_count} community members support this
            </span>
          </div>
        )}
      </div>

      {/* CTA */}
      <Button asChild className="w-full gap-2" size="sm">
        <Link to="/track" search={{ q: issue.tracking_id }}>
          Full Audit History <ArrowRight className="size-3.5" />
        </Link>
      </Button>
    </Card>
  );
}

/* ─── Map legend ─── */
function MapLegend() {
  return (
    <div className="rounded-lg border border-border bg-card/90 backdrop-blur px-3 py-2 text-[10px] shadow-card">
      <p className="font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Legend</p>
      <div className="space-y-1">
        {[
          { label: "Pending", color: "#dc2626" },
          { label: "In Progress", color: "#d97706" },
          { label: "Resolved", color: "#059669" },
          { label: "Closed", color: "#0f766e" },
          { label: "Reopened", color: "#db2777" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full border border-white/60"
              style={{ background: l.color }}
            />
            <span className="text-muted-foreground">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export function MapPage() {
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<IssueItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeStatus, setActiveStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [locateTrigger, setLocateTrigger] = useState(0);
  const [tileError, setTileError] = useState(false);
  const [listCollapsed, setListCollapsed] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadIssues = useCallback(() => {
    setLoading(true);
    setFetchError(null);
    fetchAllIssues()
      .then((data) => {
        setIssues(data);
        setSelectedIssue(data[0] ?? null);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Unable to load issues from Supabase.";
        console.warn("Could not fetch issues:", msg);
        setFetchError(msg);
        setIssues([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  const filteredIssues = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return issues.filter((i) => {
      const matchCat = activeCategory === "all" || i.category === activeCategory;
      const matchStatus = activeStatus === "all" || i.status === activeStatus;
      const matchSearch =
        !q ||
        i.title.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.address?.toLowerCase().includes(q) ||
        i.tracking_id.toLowerCase().includes(q);
      return matchCat && matchStatus && matchSearch;
    });
  }, [issues, activeCategory, activeStatus, searchQuery]);

  const handleSelect = useCallback((issue: IssueItem) => {
    setSelectedIssue(issue);
  }, []);

  const handleTileError = useCallback(() => setTileError(true), []);
  const handleRetry = useCallback(() => {
    setTileError(false);
  }, []);

  const resetFilters = () => {
    setActiveCategory("all");
    setActiveStatus("all");
    setSearchQuery("");
  };

  const hasActiveFilters =
    activeCategory !== "all" || activeStatus !== "all" || searchQuery !== "";

  return (
    <PageShell
      eyebrow="Everyone"
      title={`Live issue map — ${authority.city}`}
      lede="Every reported issue plotted on the real street map. Filter by category or status, search by keyword, or click a marker to inspect full details."
      width="wide"
      actions={
        <div className="flex flex-wrap gap-2">
          <StatusBadge status="reported" size="sm" />
          <StatusBadge status="in_progress" size="sm" />
          <StatusBadge status="resolved" size="sm" />
        </div>
      }
    >
      <div className="space-y-4">
        {/* Supabase Error Banner */}
        {fetchError && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>
                <strong>Unable to load issues from Supabase:</strong> {fetchError}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadIssues}
              className="h-7 text-xs border-destructive/40 hover:bg-destructive/20 text-destructive"
            >
              <RefreshCcw className="size-3 mr-1" /> Retry
            </Button>
          </div>
        )}

        {/* Stats bar */}
        {!loading && <StatsBar issues={issues} />}

        {/* Search + View toggle bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="map-search"
              type="text"
              placeholder="Search issues…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <Button
            id="map-filter-toggle"
            variant="outline"
            size="sm"
            onClick={() => setFiltersExpanded((v) => !v)}
            className={cn(
              "gap-1.5 h-8 text-xs",
              hasActiveFilters && "border-primary text-primary"
            )}
          >
            <Layers className="size-3.5" />
            Filters
            {hasActiveFilters && (
              <span className="size-1.5 rounded-full bg-primary" />
            )}
            {filtersExpanded ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </Button>

          {/* Locate me */}
          <Button
            id="map-locate-me"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setLocateTrigger((t) => t + 1)}
            title="Locate me"
          >
            <LocateFixed className="size-3.5" />
            <span className="hidden sm:inline">Locate me</span>
          </Button>

          {/* Reset filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs text-muted-foreground"
              onClick={resetFilters}
            >
              <RefreshCcw className="size-3" /> Reset
            </Button>
          )}
        </div>

        {/* Expandable filter panels */}
        {filtersExpanded && (
          <div className="rounded-xl border border-border bg-card/80 p-4 space-y-3 shadow-card animate-in slide-in-from-top-1 duration-150">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Category
              </p>
              <CategoryFilters
                activeCategory={activeCategory}
                onChange={setActiveCategory}
                issues={issues}
              />
            </div>
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Status
              </p>
              <StatusFilters
                activeStatus={activeStatus}
                onChange={setActiveStatus}
                issues={issues}
              />
            </div>
          </div>
        )}

        {/* Filtered result count */}
        {(hasActiveFilters || searchQuery) && (
          <p className="text-xs text-muted-foreground">
            Showing{" "}
            <span className="font-semibold text-foreground">{filteredIssues.length}</span> of{" "}
            {issues.length} issues
          </p>
        )}

        {/* Main map + sidebar grid */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          {/* Map area */}
          <div className="relative">
            <div
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-lift"
              style={{ height: "clamp(400px, 62vh, 680px)" }}
            >
              <ClientOnly fallback={<MapSkeleton />}>
                <Suspense fallback={<MapSkeleton />}>
                  {tileError ? (
                    <MapErrorState onRetry={handleRetry} />
                  ) : (
                    <CivicMap
                      issues={filteredIssues}
                      center={CITY_CENTER}
                      selectedId={selectedIssue?.id ?? null}
                      onSelect={handleSelect}
                      locateTrigger={locateTrigger}
                      onTileError={handleTileError}
                    />
                  )}
                </Suspense>
              </ClientOnly>
            </div>

            {/* Map legend overlay (desktop) */}
            <div className="absolute bottom-4 left-4 z-[1000] hidden lg:block">
              <MapLegend />
            </div>

            {/* Empty state overlay */}
            {!loading && !fetchError && filteredIssues.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl pointer-events-none">
                <div className="rounded-xl bg-card/90 backdrop-blur px-6 py-4 text-center shadow-lift border border-border pointer-events-auto">
                  <p className="text-sm font-semibold">
                    {issues.length === 0
                      ? "0 issues found in database"
                      : "No issues match your current filters"}
                  </p>
                  {hasActiveFilters && (
                    <button
                      onClick={resetFilters}
                      className="mt-2 text-xs text-primary underline underline-offset-2"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right panel: Inspector + Issue List */}
          <div className="flex flex-col gap-4">
            {/* Issue inspector */}
            <IssueInspector issue={selectedIssue} />

            {/* Issue list */}
            <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
              <button
                id="issue-list-toggle"
                className="flex w-full items-center justify-between px-4 py-3 text-left"
                onClick={() => setListCollapsed((v) => !v)}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <List className="size-4 text-muted-foreground" />
                  Issue List
                  <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {filteredIssues.length}
                  </span>
                </span>
                {listCollapsed ? (
                  <ChevronDown className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="size-4 text-muted-foreground" />
                )}
              </button>

              {!listCollapsed && (
                <div className="border-t border-border">
                  {filteredIssues.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                      No issues found
                    </p>
                  ) : (
                    <ScrollArea className="h-[260px]">
                      <div className="space-y-1.5 p-2">
                        {filteredIssues.map((issue) => (
                          <IssueListItem
                            key={issue.id}
                            issue={issue}
                            isSelected={selectedIssue?.id === issue.id}
                            onSelect={handleSelect}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}
            </div>

            {/* Legend (mobile) */}
            <div className="lg:hidden">
              <MapLegend />
            </div>
          </div>
        </div>

        {/* Quick action footer */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-3">
          <p className="text-sm text-muted-foreground">
            See a problem that isn't reported yet?
          </p>
          <Button asChild size="sm" className="gap-2">
            <Link to="/report">
              Report an issue <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
