import Link from "next/link";
import { IconChevronRight, IconSettings } from "@/components/ui/icons";

/** Chamada para concluir o onboarding — some quando professional.onboardingDone. */
export function OnboardingCard() {
  return (
    <Link
      href="/config"
      className="flex items-center gap-3.5 rounded-[22px] bg-surface px-5 py-4 shadow-[var(--shadow-card)] ring-1 ring-accent/15 hover:bg-surface-muted transition-colors"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink">
        <IconSettings width={18} height={18} />
      </span>
      <span className="min-w-0 grow">
        <span className="block text-[15px] font-semibold text-ink">Complete seu perfil</span>
        <span className="block text-[13px] text-ink-soft">
          Horários, políticas e mensagens: deixe o LashOS pronto para trabalhar por você.
        </span>
      </span>
      <IconChevronRight className="shrink-0 text-ink-faint" width={18} height={18} />
    </Link>
  );
}
