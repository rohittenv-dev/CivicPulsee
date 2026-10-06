import { useState, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { authority, departments } from "@/config/authority";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { fetchAllIssues, updateIssueStatus, type IssueItem } from "@/lib/services/issue-service";
import { uploadIssuePhoto } from "@/lib/services/photo-upload";
import { useAuth } from "@/lib/auth/auth-context";
import { AuthDialog } from "@/components/auth/auth-dialog";
import { Lock } from "lucide-react";
import type { IssueStatus } from "@/lib/lifecycle";
import { toast } from "sonner";
import {
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  MapPin,
  Upload,
  UserCheck,
  ArrowUpRight,
  SlidersHorizontal,
} from "lucide-react";

export const Route = createFileRoute("/official")({
  head: () => ({
    meta: [
      { title: `Official dashboard — ${authority.authorityShortName} | ${authority.productName}` },
      {
        name: "description",
        content: `Work queue for ${authority.authorityName} staff: triage by urgency, move issues through the lifecycle, and close them with photo proof.`,
      },
    ],
  }),
  component: OfficialPage,
});

export function OfficialPage() {
  const { user, ready, isOfficial, canWorkOn } = useAuth();
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Resolution modal state
  const [resolvingIssue, setResolvingIssue] = useState<IssueItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [proofPhotoUrl, setProofPhotoUrl] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchAllIssues();
    setIssues(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (issueId: string, newStatus: IssueStatus) => {
    const updated = await updateIssueStatus(issueId, newStatus, undefined, undefined, user?.name);
    if (updated) {
      toast.success(`Complaint status updated to "${newStatus.replace("_", " ")}"`);
      loadData();
    }
  };

  const handleCompleteResolution = async () => {
    if (!resolvingIssue) return;
    if (!resolutionNotes.trim()) {
      toast.error("Please add a short note describing the work completed");
      return;
    }

    if (!proofPhotoUrl) {
      toast.error("Attach a photo of the completed work as proof.");
      return;
    }

    const updated = await updateIssueStatus(
      resolvingIssue.id,
      "resolved",
      resolutionNotes,
      proofPhotoUrl,
      user?.name
    );

    if (updated) {
      toast.success(`Issue ${resolvingIssue.tracking_id} resolved with proof of work!`);
      setResolvingIssue(null);
      setResolutionNotes("");
      setProofPhotoUrl(null);
      loadData();
    }
  };

  const filteredIssues = issues.filter((i) => {
    // An official only ever sees the queue their employee code authorises.
    if (!canWorkOn(i.department_id)) return false;
    if (selectedDept !== "all" && i.department_id !== selectedDept) return false;
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    return true;
  });

  const countPending = issues.filter((i) => i.status === "reported" || i.status === "assigned").length;
  const countInProgress = issues.filter((i) => i.status === "in_progress" || i.status === "reopened").length;
  const countResolved = issues.filter((i) => i.status === "resolved" || i.status === "confirmed").length;

  // Officials only. Citizens (and signed-out visitors) never see lifecycle controls.
  if (ready && !isOfficial) {
    return (
      <PageShell
        eyebrow={authority.authorityShortName}
        title="Staff area — sign in with an employee code"
        lede="The triage queue changes the official record of a complaint, so only registered municipal staff can open it."
      >
        <Card className="mx-auto max-w-xl space-y-4 border-border bg-card p-8 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-secondary">
            <Lock className="size-5 text-muted-foreground" />
          </span>
          <h2 className="font-display text-lg font-bold">Restricted to {authority.authorityShortName} staff</h2>
          <p className="text-sm text-muted-foreground">
            {user
              ? "You're signed in as a citizen. Citizens report issues, add their voice, and confirm or reopen a fix from the Track page — they never change a complaint's official status."
              : `Sign in with the employee code and department PIN issued by ${authority.authorityName}.`}
          </p>
          <div className="flex justify-center gap-2">
            <AuthDialog trigger={<Button>Sign in as an official</Button>} />
            <Button asChild variant="outline">
              <a href="/track">Track a complaint instead</a>
            </Button>
          </div>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow={authority.authorityShortName}
      title="Municipal Official Triage Queue"
      lede={`Manage incoming civic complaints across ${authority.city}, assign crews, and upload proof of work.`}
      width="wide"
    >
      <div className="space-y-6">
        {/* Top Summary Metrics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="border-pending/30 bg-pending/5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pending Triage
              </span>
              <AlertCircle className="size-4 text-pending" />
            </div>
            <div className="mt-2 font-mono text-3xl font-bold text-pending">{countPending}</div>
          </Card>

          <Card className="border-progress/30 bg-progress/5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Actively In Progress
              </span>
              <Clock className="size-4 text-progress" />
            </div>
            <div className="mt-2 font-mono text-3xl font-bold text-progress">{countInProgress}</div>
          </Card>

          <Card className="border-resolved/30 bg-resolved/5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Resolved Complaints
              </span>
              <CheckCircle2 className="size-4 text-resolved" />
            </div>
            <div className="mt-2 font-mono text-3xl font-bold text-resolved">{countResolved}</div>
          </Card>
        </div>

        {/* Queue Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal className="size-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-2">
              Filter Queue:
            </span>

            {/* Department Filter */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Statuses</option>
              <option value="reported">Reported</option>
              <option value="in_progress">In Progress</option>
              <option value="reopened">Reopened</option>
              <option value="resolved">Resolved</option>
              <option value="confirmed">Confirmed</option>
            </select>
          </div>

          <span className="text-xs text-muted-foreground font-mono">
            Showing {filteredIssues.length} of {issues.length} total complaints
          </span>
        </div>

        {/* Issue Queue List */}
        <div className="space-y-4">
          {filteredIssues.map((item) => (
            <Card key={item.id} className="border-border bg-card p-5 shadow-sm transition-all hover:shadow-card">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-primary">{item.tracking_id}</span>
                    <Badge variant="outline" className="capitalize text-xs">
                      {item.category}
                    </Badge>
                    <Badge
                      className={`capitalize text-[10px] ${
                        item.severity === "urgent"
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {item.severity} severity
                    </Badge>
                    <StatusBadge status={item.status} />
                  </div>

                  <h3 className="font-display text-base font-semibold">{item.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" /> {item.address}
                    </span>
                    <span>Voices: {item.support_count}</span>
                    <span>
                      Dept: {departments.find((d) => d.slug === item.department_id)?.name || "Roads"}
                    </span>
                  </div>
                </div>

                {/* Quick Lifecycle Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 md:border-t-0 md:pt-0 shrink-0">
                  {item.status === "reported" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(item.id, "assigned")}
                      className="gap-1 text-xs"
                    >
                      <UserCheck className="size-3.5" /> Assign to my department
                    </Button>
                  )}

                  {item.status === "assigned" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(item.id, "in_progress")}
                      className="gap-1 text-xs"
                    >
                      <Clock className="size-3.5" /> Start work
                    </Button>
                  )}

                  {item.status === "in_progress" && (
                    <Button
                      size="sm"
                      onClick={() => setResolvingIssue(item)}
                      className="gap-1 bg-emerald-600 text-white text-xs hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="size-3.5" /> Mark resolved + upload proof
                    </Button>
                  )}

                  {item.status === "reopened" && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => setResolvingIssue(item)}
                      className="gap-1 text-xs"
                    >
                      <CheckCircle2 className="size-3.5" /> Re-inspect &amp; upload new proof
                    </Button>
                  )}

                  {item.status === "resolved" && (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3.5" /> Proof submitted — awaiting citizen confirmation
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Resolution Dialog Modal */}
        <Dialog open={!!resolvingIssue} onOpenChange={() => setResolvingIssue(null)}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="font-display">Upload Proof of Resolution</DialogTitle>
              <DialogDescription>
                Provide resolution notes and a photo of the completed municipal work for{" "}
                <strong className="font-mono text-foreground">{resolvingIssue?.tracking_id}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Resolution Notes</label>
                <Textarea
                  placeholder="Describe the action taken (e.g. Crew repaired asphalt patch, 200kg material used)"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Proof Photo</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-secondary/30 p-4 text-center hover:border-primary"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingProof(true);
                      try {
                        // Must be a durable public URL — blob: URLs die with the tab.
                        setProofPhotoUrl(await uploadIssuePhoto(file, "proof"));
                        toast.success("Proof photo uploaded.");
                      } catch {
                        toast.error("Proof photo upload failed. Try again.");
                      } finally {
                        setUploadingProof(false);
                      }
                    }}
                  />
                  {uploadingProof ? (
                    <span className="text-xs text-muted-foreground">Uploading proof photo…</span>
                  ) : proofPhotoUrl ? (
                    <img src={proofPhotoUrl} alt="Proof preview" className="h-32 rounded object-cover" />
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Upload className="size-4" /> Click to attach completed work photo
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setResolvingIssue(null)}>
                Cancel
              </Button>
              <Button onClick={handleCompleteResolution} disabled={uploadingProof} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Submit & Close Issue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  );
}
