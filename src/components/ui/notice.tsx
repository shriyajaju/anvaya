import { AlertCircle, Info } from "lucide-react";

export type NoticeKind = "Warning" | "Error" | "Info";

const noticeClass: Record<NoticeKind, string> = {
  Warning: "bg-conf-medium-bg text-conf-medium",
  Error: "bg-conf-low-bg text-conf-low",
  Info: "bg-review-bg text-review",
};

export function Notice({
  kind = "Warning",
  message,
  className = "",
}: {
  kind?: NoticeKind;
  message: string;
  className?: string;
}) {
  const Icon = kind === "Info" ? Info : AlertCircle;
  return (
    <div role={kind === "Error" ? "alert" : "status"} className={`flex w-[360px] items-start gap-2.5 rounded-card px-3.5 py-3 text-[13px] leading-5 ${noticeClass[kind]} ${className}`}>
      <Icon aria-hidden className="size-5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
