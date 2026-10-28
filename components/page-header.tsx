import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

export function DemoDataBadge() {
  return (
    <Badge
      variant="outline"
      className="w-fit border-[#d8d2c4] bg-[#f5f1e7] text-[11px] font-normal tracking-wide text-[#737668]"
    >
      演示数据
    </Badge>
  );
}

export function PageHeader({
  title,
  description,
  action,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-5 border-b border-[#e2dccf] pb-7 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="max-w-2xl">
        <DemoDataBadge />
        <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-[#2f332b] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-7 text-[#70746a] sm:text-base">
          {description}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}