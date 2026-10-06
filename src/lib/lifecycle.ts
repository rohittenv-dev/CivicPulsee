export const issueStatuses = [
  "reported",
  "assigned",
  "in_progress",
  "resolved",
  "confirmed",
  "reopened",
] as const;

export type IssueStatus = (typeof issueStatuses)[number];

type StatusMeta = {
  label: string;
  /** Short, citizen-facing explanation of what this state means. */
  blurb: string;
  /** Semantic token family used across badges, map pins and charts. */
  tone: "pending" | "progress" | "resolved" | "closed" | "alert";
};

export const statusMeta: Record<IssueStatus, StatusMeta> = {
  reported: {
    label: "Reported",
    blurb: "Filed and waiting for a department to pick it up.",
    tone: "pending",
  },
  assigned: {
    label: "Assigned",
    blurb: "A department has taken ownership of the work.",
    tone: "progress",
  },
  in_progress: {
    label: "In progress",
    blurb: "Someone is actively working on this right now.",
    tone: "progress",
  },
  resolved: {
    label: "Resolved",
    blurb: "Work is done and proof was uploaded. Awaiting your confirmation.",
    tone: "resolved",
  },
  confirmed: {
    label: "Closed",
    blurb: "Confirmed fixed by the citizen who reported it.",
    tone: "closed",
  },
  reopened: {
    label: "Reopened",
    blurb: "The citizen said the fix did not hold. Back in the queue.",
    tone: "alert",
  },
};

/** The order shown in the citizen-facing lifecycle timeline. */
export const lifecycleOrder: IssueStatus[] = [
  "reported",
  "assigned",
  "in_progress",
  "resolved",
  "confirmed",
];

export const severities = ["low", "medium", "high", "urgent"] as const;
export type Severity = (typeof severities)[number];
export type IssueSeverity = Severity;

export const severityMeta: Record<Severity, { label: string; blurb: string }> = {
  low: { label: "Low", blurb: "Cosmetic or minor inconvenience." },
  medium: { label: "Medium", blurb: "Daily disruption for the neighbourhood." },
  high: { label: "High", blurb: "Unsafe or affecting many people." },
  urgent: { label: "Urgent", blurb: "Immediate danger to life or property." },
};
