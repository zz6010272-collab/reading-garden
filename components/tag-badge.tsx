import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type TagBadgeProps = {
  name: string;
  className?: string;
};

export function TagBadge({ name, className }: TagBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-full border border-[#ded8c8] bg-[#eee9dc] px-2.5 py-0.5 text-[11px] font-normal text-[#5d6655]",
        className,
      )}
    >
      {name}
    </Badge>
  );
}