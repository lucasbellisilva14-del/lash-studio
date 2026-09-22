/** Skeleton da página pública enquanto o estúdio carrega. */
export default function Loading() {
  return (
    <div className="min-h-dvh bg-[#FAF5EF]" aria-busy="true" aria-label="Carregando">
      <div className="mx-auto w-full max-w-lg px-4 pt-10">
        <div className="flex flex-col items-center gap-3">
          <div className="h-20 w-20 animate-pulse rounded-3xl bg-black/[0.07]" />
          <div className="h-3 w-40 animate-pulse rounded-full bg-black/[0.07]" />
          <div className="h-7 w-56 animate-pulse rounded-full bg-black/[0.09]" />
        </div>
        <div className="mt-10 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-black/[0.06]" />
          ))}
        </div>
      </div>
    </div>
  );
}
