import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="relative isolate flex min-h-[280px] w-full items-center justify-center overflow-hidden rounded-card bg-page px-8 py-12">
      <span aria-hidden className="absolute left-[6%] top-[8%] size-52 rounded-full bg-review/55 blur-2xl" />
      <span aria-hidden className="absolute right-[8%] top-[18%] size-44 rounded-full bg-conf-medium/60 blur-2xl" />
      <span aria-hidden className="absolute bottom-[6%] left-[28%] size-52 rounded-full bg-accent/45 blur-2xl" />
      <div className="relative max-w-md text-center">
        <h2 className="text-[24px] font-medium leading-8 text-text-1">{title}</h2>
        <p className="mt-2 text-[15px] leading-6 text-text-2">{body}</p>
        {action ? <div className="mt-6 flex justify-center">{action}</div> : <div className="mt-6 flex justify-center"><Button label="Create" /></div>}
      </div>
    </div>
  );
}
