import { cn } from "@/lib/cn";

/** Bloco de carregamento com pulso — base dos skeletons de página. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-xl bg-surface-sunken/80", className)}
    />
  );
}

/** Cabeçalho de página em carregamento (título + subtítulo). */
export function SkeletonHeader() {
  return (
    <div className="pt-2 pb-5 space-y-2.5">
      <Skeleton className="h-7 w-44" />
      <Skeleton className="h-4 w-64" />
    </div>
  );
}

/** Card com linhas de conteúdo em carregamento. */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <div className="grow space-y-2">
            <Skeleton className="h-3.5 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton padrão de página inteira: cabeçalho + cards. */
export function PageSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div aria-busy="true" aria-label="Carregando">
      <SkeletonHeader />
      <div className="space-y-4">
        {Array.from({ length: cards }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
