import { redirect } from "next/navigation";
import { requireProfessional, requireViewer } from "@/lib/session";
import { getTeam } from "@/lib/team";
import { firstName } from "@/lib/team-shared";
import { acessoBloqueado } from "@/lib/domain/subscription";
import { precisaCadastrarCartao } from "@/lib/domain/plans";
import { assinaturasDisponiveis } from "@/lib/mp-subscription";
import { diffLocalDays, formatDate } from "@/lib/dates";
import { BottomNav } from "@/components/shell/bottom-nav";
import { PwaRegister } from "@/components/shell/pwa-register";
import { Sidebar } from "@/components/shell/sidebar";
import { DesktopRail } from "@/components/shell/desktop-rail";
import { PullToRefresh } from "@/components/shell/pull-to-refresh";
import { TrialBanner, type TrialBannerInfo } from "@/components/shell/trial-banner";
import { ContentFrame, RailSlot } from "@/components/shell/content-frame";
import { QuickPanel } from "@/components/shell/quick/quick-panel";
import { linkPublico } from "@/components/shell/quick/atalhos";
import { HomeFab } from "@/components/home/home-fab";
import { carregarCobranca, carregarRespostas } from "@/app/(app)/ferramentas/data";
import { sairDaConta } from "@/components/shell/sign-out-action";
import { Button } from "@/components/ui/button";
import { IconLock, IconLogout } from "@/components/ui/icons";

/**
 * Shell autenticado — app de trabalho neutro (a cor do estúdio vale só no
 * link público). Celular: coluna única + barra inferior. PC (lg+): menu
 * lateral com nomes, conteúdo e coluna de resumo (some na agenda).
 * A funcionária (equipe) vê a navegação dela, sem gestão do estúdio.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const viewer = await requireViewer();
  const professional = await requireProfessional();

  // Trava de assinatura: vencida/suspensa. A dona vai para a renovação (dados
  // intactos); a assinatura é só dela, então a equipe vê o aviso aqui mesmo.
  if (acessoBloqueado(professional)) {
    if (viewer.isOwner) redirect("/assinatura");
    return <AcessoPausado donaNome={professional.name} studioName={professional.studioName} />;
  }
  // Cadastro pelo site: o teste só começa com o cartão salvo (nenhuma cobrança até o fim dele).
  if (viewer.isOwner && assinaturasDisponiveis() && precisaCadastrarCartao(professional)) {
    redirect("/assinatura?cartao=1");
  }

  const banner = viewer.isOwner ? bannerDaAssinatura(professional) : null;

  // "Copiar meu link" da funcionária só faz sentido se ela atende pelo link.
  const noLink = viewer.isOwner
    ? true
    : Boolean(
        (await getTeam(professional.id)).find((p) => p.memberId === viewer.memberId)?.bookableOnline,
      );
  // Atalhos (aba lateral no PC e "+" no celular): link público e calculadora de cobrança (dona).
  const linkPath = linkPublico(professional.slug, viewer, noLink);
  const [cobranca, respostas] = viewer.isOwner
    ? await Promise.all([carregarCobranca(professional.id), carregarRespostas(professional)])
    : [null, null];

  return (
    <div className="min-h-dvh lg:flex">
      <Sidebar
        studioName={professional.studioName}
        professionalName={professional.name}
        logoUrl={professional.logoUrl}
        slug={professional.slug}
        viewer={{ isOwner: viewer.isOwner, name: viewer.name, memberId: viewer.memberId }}
        noLink={noLink}
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

      <QuickPanel isOwner={viewer.isOwner} linkPath={linkPath} cobranca={cobranca} respostas={respostas} />

      <div className="lg:hidden">
        <BottomNav isOwner={viewer.isOwner} />
        <HomeFab showExpense={viewer.isOwner} linkPath={linkPath} cobranca={cobranca} />
      </div>
      <PwaRegister />
    </div>
  );
}

/** Funcionária com o estúdio bloqueado: só a dona resolve a assinatura. */
function AcessoPausado({ donaNome, studioName }: { donaNome: string; studioName: string }) {
  return (
    <div className="flex min-h-dvh flex-col justify-center px-6 py-10">
      <div className="mx-auto w-full max-w-sm text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] bg-surface text-ink-soft shadow-[var(--shadow-card)] ring-1 ring-[rgb(23_21_30/0.04)]">
          <IconLock width={24} height={24} />
        </span>
        <p className="mt-6 text-[13px] font-semibold text-ink-soft">{studioName}</p>
        <h1 className="mt-1.5 text-[28px] font-bold leading-[1.12] tracking-[-0.035em] text-ink text-balance">
          O acesso do estúdio está pausado
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          Fale com {firstName(donaNome)}. Quando o acesso voltar, o app abre do jeito que estava.
        </p>
        <form action={sairDaConta} className="mt-8">
          <Button type="submit" variant="secondary">
            <IconLogout width={18} height={18} />
            Sair da conta
          </Button>
        </form>
      </div>
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
