import Link from "next/link";
import { Card } from "@/components/ui/card";
import { IconChevronRight, IconSettings } from "@/components/ui/icons";

/** Chamada para concluir o onboarding — some quando professional.onboardingDone. */
export function OnboardingCard() {
  return (
    <Link href="/config" className="block">
      <Card className="border-accent bg-accent-soft px-4 py-3.5 hover:opacity-90 transition-opacity">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-ink">
            <IconSettings />
          </span>
          <div className="grow min-w-0">
            <p className="font-medium text-[15px] text-ink">Complete seu perfil</p>
            <p className="text-[13px] text-ink-soft">
              Horários, políticas e mensagens — deixe o LashOS pronto para trabalhar por você.
            </p>
          </div>
          <IconChevronRight className="text-accent-strong shrink-0" width={18} height={18} />
        </div>
      </Card>
    </Link>
  );
}
