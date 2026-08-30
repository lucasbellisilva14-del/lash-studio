/* eslint-disable @next/next/no-img-element */

/** Saudação da home: "Bom dia, <nome>" + data por extenso + estúdio discreto. */
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
    <header className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[13px] text-ink-soft">{dateLabel}</p>
        <h1 className="font-display text-[26px] leading-8 font-semibold text-ink mt-0.5 truncate">
          {greeting}, {firstName}
        </h1>
        <p className="text-[13px] text-ink-faint mt-1 truncate">{studioName}</p>
      </div>
      <div className="shrink-0" aria-hidden>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            className="h-11 w-11 rounded-full object-cover border border-line bg-surface"
          />
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent-strong font-display font-semibold text-base">
            {studioName.trim().charAt(0).toUpperCase() || "L"}
          </span>
        )}
      </div>
    </header>
  );
}
