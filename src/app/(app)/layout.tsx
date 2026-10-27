import { redirect } from "next/navigation";
import { requireProfessional } from "@/lib/session";
import { acessoBloqueado } from "@/lib/domain/subscription";
import { diffLocalDays, formatDate } from "@/lib/dates";
import { BottomNav } from "@/components/shell/bottom-nav";
import { PwaRegister } from "@/components/shell/pwa-register";
import { Sidebar } from "@/components/shell/sidebar";
import { DesktopRail } from "@/components/shell/desktop-rail";
import { PullToRefresh } from "@/components/shell/pull-to-refresh";
import { TrialBanner, type TrialBannerInfo } from "@/components/shell/trial-banner";
import { ContentFrame, RailSlot } from "@/components/shell/content-frame";

/**
 * Shell autenticado — app de trabalho neutro (a cor do estúdio vale só no
 * link público). Celular: coluna única + barra inferior. PC (lg+): menu
 * lateral com nomes, conteúdo e coluna de resumo (some na agenda).
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const professional = await requireProfessional();

  // Trava de assinatura: vencida/suspensa → tela de renovação (dados intactos).
  if (acessoBloqueado(professional)) redirect("/assinatura");

  const banner = bannerDaAssinatura(professional);

  return (
    <div className="min-h-dvh lg:flex">
      <Sidebar
        studioName={professional.studioName}
        professionalName={professional.name}
        logoUrl={professional.logoUrl}
        slug={professional.slug}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {banner ? <TrialBanner info={banner} /> : null}
        <main className="mx-auto w-full max-w-lg grow px-4 pt-5 pb-[calc(168px+env(safe-area-inset-bottom))] lg:max-w-none lg:mx-0 lg:px-10 lg:pt-9 lg:pb-12 lg:flex lg:items-start lg:gap-8 xl:px-12">
          <ContentFrame>
            <PullToRefresh>{children}</PullToRefresh>
          </ContentFrame>
          <RailSlot>
            <DesktopRail professional={professional} />
          </RailSlot>
        </main>
      </div>

      <div className="lg:hidden">
        <BottomNav />
      </div>
      <PwaRegister />
    </div>
  );
}

/** Aviso do topo: teste grátis acabando ou mensalidade manual vencendo. */
function bannerDaAssinatura(p: {
  subscriptionStatus: string;
  trialEndsAt: Date | null;
  subscriptionPaidUntil: Date | null;
  mpPreapprovalId: string | null;
  timezone: string;
}): TrialBannerInfo | null {
  const now = new Date();
  if (p.subscriptionStatus === "TRIAL" && p.trialEndsAt && p.trialEndsAt > now) {
    const dias = diffLocalDays(now, p.trialEndsAt, p.timezone);
    return {
      key: "teste",
      text:
        dias <= 0
          ? "Seu teste grátis termina hoje."
          : `Seu teste grátis termina em ${dias} ${dias === 1 ? "dia" : "dias"} (${formatDate(p.trialEndsAt, p.timezone)}).`,
      detail: "Assine para continuar sem interrupção.",
      cta: "Assinar agora",
    };
  }
  if (p.subscriptionStatus === "ATIVA" && !p.mpPreapprovalId && p.subscriptionPaidUntil) {
    const dias = diffLocalDays(now, p.subscriptionPaidUntil, p.timezone);
    if (dias >= 0 && dias <= 5) {
      return {
        key: "mensalidade",
        text:
          dias === 0
            ? "Sua mensalidade vence hoje."
            : `Sua mensalidade vence em ${dias} ${dias === 1 ? "dia" : "dias"}.`,
        detail: "Ative o cartão recorrente e não se preocupe mais com isso.",
        cta: "Renovar",
      };
    }
  }
  return null;
}
