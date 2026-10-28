import type { ReactNode } from "react";
import { Inbox, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-[#d8d2c3] bg-[#f7f3ea]/70 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-full border border-[#ddd6c5] bg-[#ede8dc] text-[#7a816f]">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <h2 className="font-serif text-xl font-semibold text-[#34372f]">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#73766c]">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}