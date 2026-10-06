import { supabase } from "@/integrations/supabase/client";
import { generateTrackingId, computeEventHash } from "@/lib/tracking-id";
import type { IssueSeverity, IssueStatus } from "@/lib/lifecycle";

// The generated Database types do not yet include the CivicPulse tables, so
// table access is untyped here on purpose.
const db = supabase as any;

export interface IssueItem {
  id: string;
  tracking_id: string;
  category: string;
  severity: IssueSeverity;
  status: IssueStatus;
  title: string;
  description: string;
  photo_url?: string | null;
  latitude: number;
  longitude: number;
  address?: string | null;
  department_id?: string | null;
  reporter_id?: string | null;
  reporter_phone?: string | null;
  support_count: number;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  proof_photo_url?: string | null;
  resolution_notes?: string | null;
  reopen_reason?: string | null;
}

export interface IssueEventItem {
  id: string;
  issue_id: string;
  previous_status?: IssueStatus | null;
  new_status: IssueStatus;
  actor_id?: string | null;
  actor_name?: string | null;
  comment?: string | null;
  prev_hash?: string | null;
  event_hash: string;
  created_at: string;
}

export async function fetchAllIssues(): Promise<IssueItem[]> {
  const { data, error } = await db
    .from("issues")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw error;
  return (data ?? []) as IssueItem[];
}

export async function fetchIssueByTrackingId(trackingId: string): Promise<IssueItem | null> {
  const formattedId = trackingId.trim().toUpperCase();
  const { data, error } = await db
    .from("issues")
    .select("*")
    .eq("tracking_id", formattedId)
    .maybeSingle();
  if (error) throw error;
  return (data as IssueItem) ?? null;
}

export async function fetchIssueEvents(issueId: string): Promise<IssueEventItem[]> {
  const { data, error } = await db
    .from("issue_events")
    .select("*")
    .eq("issue_id", issueId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data ?? []) as IssueEventItem[];
}

export async function createNewIssue(payload: {
  category: string;
  severity: IssueSeverity;
  title: string;
  description: string;
  photo_url?: string | null;
  latitude: number;
  longitude: number;
  address?: string | null;
  department_id?: string | null;
  /** E.164 phone of the signed-in citizen. Required — it is the ownership key. */
  reporter_phone: string;
}): Promise<IssueItem> {
  const trackingId = generateTrackingId();
  const now = new Date().toISOString();

  const { data, error } = await db
    .from("issues")
    .insert([
      {
        tracking_id: trackingId,
        category: payload.category,
        severity: payload.severity,
        status: "reported",
        title: payload.title,
        description: payload.description,
        photo_url: payload.photo_url ?? null,
        latitude: payload.latitude,
        longitude: payload.longitude,
        address: payload.address ?? null,
        department_id: payload.department_id ?? "roads",
        reporter_phone: payload.reporter_phone,
        support_count: 1,
      },
    ])
    .select()
    .single();

  if (error || !data) throw error ?? new Error("Could not register the complaint");

  const genesisHash = await computeEventHash(data.id, "reported", null, now);
  await db.from("issue_events").insert([
    {
      issue_id: data.id,
      previous_status: null,
      new_status: "reported",
      actor_name: payload.reporter_phone,
      comment: "Initial citizen complaint filed",
      prev_hash: "GENESIS",
      event_hash: genesisHash,
    },
  ]);

  return data as IssueItem;
}

export async function addVoiceSupport(issueId: string): Promise<number> {
  const { data: current } = await db
    .from("issues")
    .select("support_count")
    .eq("id", issueId)
    .maybeSingle();
  const next = (current?.support_count ?? 1) + 1;
  const { data, error } = await db
    .from("issues")
    .update({ support_count: next, updated_at: new Date().toISOString() })
    .eq("id", issueId)
    .select("support_count")
    .single();
  if (error || !data) return current?.support_count ?? 1;
  return data.support_count as number;
}

export async function updateIssueStatus(
  issueId: string,
  newStatus: IssueStatus,
  notes?: string,
  proofPhotoUrl?: string,
  actorName?: string
): Promise<IssueItem | null> {
  const now = new Date().toISOString();

  const { data: before } = await db
    .from("issues")
    .select("status")
    .eq("id", issueId)
    .maybeSingle();

  const updateObj: Record<string, any> = { status: newStatus, updated_at: now };
  if (newStatus === "resolved") {
    updateObj["resolved_at"] = now;
    if (notes) updateObj["resolution_notes"] = notes;
    if (proofPhotoUrl) updateObj["proof_photo_url"] = proofPhotoUrl;
  } else if (newStatus === "reopened") {
    if (notes) updateObj["reopen_reason"] = notes;
  }

  const { data, error } = await db
    .from("issues")
    .update(updateObj)
    .eq("id", issueId)
    .select()
    .single();

  if (error || !data) throw error ?? new Error("Status update failed");

  const previousEvents = await fetchIssueEvents(issueId);
  const prevHash = previousEvents.at(-1)?.event_hash ?? "GENESIS";
  const eventHash = await computeEventHash(issueId, newStatus, prevHash, now);

  await db.from("issue_events").insert([
    {
      issue_id: issueId,
      previous_status: before?.status ?? null,
      new_status: newStatus,
      actor_name: actorName ?? null,
      comment: notes || `Status updated to ${newStatus}`,
      prev_hash: prevHash,
      event_hash: eventHash,
    },
  ]);

  return data as IssueItem;
}
