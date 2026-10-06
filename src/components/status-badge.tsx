import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { statusMeta, type IssueStatus } from "@/lib/lifecycle";

const badge = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      tone: {
        pending: "border-pending/25 bg-pending-soft text-pending",
        progress: "border-progress/30 bg-progress-soft text-progress-foreground",
        resolved: "border-resolved/25 bg-resolved-soft text-resolved",
        closed: "border-closed/25 bg-closed-soft text-closed",
        alert: "border-alert/25 bg-alert-soft text-alert",
      },
      size: {
        sm: "px-2 py-0 text-[0.6875rem]",
        md: "",
      },
    },
    defaultVariants: { tone: "pending", size: "md" },
  },
);

export function StatusDot({ status, className }: { status: IssueStatus; className?: string }) {
  const tone = statusMeta[status].tone;
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2 rounded-full",
        tone === "pending" && "bg-pending",
        tone === "progress" && "bg-progress",
        tone === "resolved" && "bg-resolved",
        tone === "closed" && "bg-closed",
        tone === "alert" && "bg-alert",
        className,
      )}
    />
  );
}

export function StatusBadge({
  status,
  size,
  className,
}: { status: IssueStatus; className?: string } & Pick<VariantProps<typeof badge>, "size">) {
  const meta = statusMeta[status];
  return (
    <span className={cn(badge({ tone: meta.tone, size }), className)}>
      <StatusDot status={status} />
      {meta.label}
    </span>
  );
}
