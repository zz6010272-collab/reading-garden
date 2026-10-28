import { LoadingState } from "@/components/loading-state";

export default function LibraryLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 h-28 animate-pulse rounded-2xl bg-[#ece6da]" />
      <LoadingState cards={8} label="正在整理你的书房…" />
    </div>
  );
}