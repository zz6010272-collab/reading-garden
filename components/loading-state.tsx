type LoadingStateProps = {
  cards?: number;
  label?: string;
};

export function LoadingState({
  cards = 6,
  label = "正在整理纸页…",
}: LoadingStateProps) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label={label}>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }, (_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-[#e2dccf] bg-[#fbf8f1] p-4"
          >
            <div className="mb-4 aspect-[4/3] w-full animate-pulse rounded-xl bg-[#e8e1d3]" />
            <div className="mb-3 h-5 w-4/5 animate-pulse rounded bg-[#e4ddce]" />
            <div className="mb-2 h-4 w-2/3 animate-pulse rounded bg-[#ece6da]" />
            <div className="h-4 w-full animate-pulse rounded bg-[#ece6da]" />
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-[#7b7d73]">{label}</p>
    </div>
  );
}