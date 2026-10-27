/* eslint-disable @next/next/no-img-element */

/** Topo da home: o dia por extenso como título e a saudação embaixo. */
export function Greeting({
  greeting,
  firstName,
  dateLabel,
  studioName,
  logoUrl,
}: {
  greeting: string;
  firstName: string;
  dateLabel: string;
  studioName: string;
  logoUrl: string | null;
}) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-[28px] font-bold leading-[1.12] tracking-[-0.035em] text-ink text-balance lg:text-[34px]">
          {dateLabel}
        </h1>
        <p className="mt-1.5 text-[14px] text-ink-soft">
          {greeting}, {firstName}
        </p>
      </div>
      <div className="shrink-0 lg:hidden" aria-hidden>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            className="h-10 w-10 rounded-full object-cover ring-1 ring-line bg-surface"
          />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-ink font-bold text-[15px] shadow-[var(--shadow-card)]">
            {studioName.trim().charAt(0).toUpperCase() || "L"}
          </span>
        )}
      </div>
    </header>
  );
}
