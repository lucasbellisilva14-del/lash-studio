import { Skeleton, SkeletonCard, SkeletonHeader } from "@/components/ui/skeleton";

/** Skeleton da lista de clientes: busca + filtros + lista. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Carregando clientes">
      <SkeletonHeader />
      <Skeleton className="h-12 w-full rounded-2xl mb-3" />
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full shrink-0" />
        ))}
      </div>
      <SkeletonCard lines={6} />
    </div>
  );
}
