import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

/** Skeleton da agenda: seletor de dias + horários do dia. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Carregando agenda">
      <SkeletonHeader />
      <div className="flex gap-2 overflow-hidden mb-5">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-12 rounded-2xl shrink-0" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-4 w-11 mt-1 shrink-0" />
            <Skeleton className="h-20 grow rounded-2xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
