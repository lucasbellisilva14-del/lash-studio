import Link from "next/link";
import { requireProfessional, requireViewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { formatDate } from "@/lib/dates";
import { STATUS_ASSINATURA_LABEL } from "@/lib/domain/subscription";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { SupportButton } from "@/components/shell/support";
import { sairDaConta } from "@/components/shell/sign-out-action";
import {
  IconBell,
  IconCalendar,
  IconCard,
  IconChevronRight,
  IconClock,
  IconLock,
  IconLogout,
  IconMoney,
  IconNote,
  IconTeam,
} from "@/components/ui/icons";
import { IconPercent, IconShield, IconUser } from "@/components/config/icons";

export const metadata = { title: "Configurações" };

type Item = {
  href: string;
  label: string;
  description: string;
  icon: typeof IconBell;
};

function Grupo({ titulo, itens }: { titulo: string; itens: Item[] }) {
  return (
    <section>
      <h2 className="mb-2.5 px-1 text-[13px] font-semibold text-ink-soft">{titulo}</h2>
      <Card className="divide-y divide-line overflow-hidden">
        {itens.map(({ href, label, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-surface-muted transition-colors sm:px-5"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-soft">
              <Icon width={18} height={18} />
            </span>
            <span className="min-w-0 grow">
              <span className="block text-[15px] font-semibold text-ink">{label}</span>
              <span className="block truncate text-[13px] text-ink-soft">{description}</span>
            </span>
            <IconChevronRight className="shrink-0 text-ink-faint" width={18} height={18} />
          </Link>
        ))}
      </Card>
    </section>
  );
}

/** Funcionária: só a senha dela, o suporte e sair. O resto é do estúdio (da dona). */
function ConfigDaEquipe() {
  return (
    <div>
      <PageHeader
        title="Configurações"
        subtitle="Sua senha de acesso e ajuda com o app."
        backHref="/mais"
      />
      <div className="space-y-6">
        <Grupo
          titulo="Sua conta"
          itens={[
            {
              href: "/config/senha",
              label: "Sua senha",
              description: "Troque a senha do seu login",
              icon: IconLock,
            },
          ]}
        />
        <Card className="overflow-hidden">
          <SupportButton variant="row" />
        </Card>
        <form action={sairDaConta}>
          <button
            type="submit"
            className="mx-auto flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-semibold text-ink-soft hover:bg-danger-soft hover:text-danger transition-colors"
          >
            <IconLogout width={18} height={18} />
            Sair da conta
          </button>
        </form>
      </div>
    </div>
  );
}

export default async function ConfigPage() {
  const viewer = await requireViewer();
  if (!viewer.isOwner) return <ConfigDaEquipe />;

  const professional = await requireProfessional();
  const tz = professional.timezone;

  const [activeDays, feeCount, pushDeviceCount, equipeAtiva, convitesPendentes] = await Promise.all([
    prisma.workingHour.count({
      where: { professionalId: professional.id, active: true },
    }),
    prisma.paymentMethodFee.count({
      where: { professionalId: professional.id },
    }),
    prisma.pushSubscription.count({
      where: { professionalId: professional.id },
    }),
    prisma.teamMember.count({
      where: { professionalId: professional.id, active: true },
    }),
    prisma.teamMember.count({
      where: { professionalId: professional.id, active: true, passwordHash: null },
    }),
  ]);

  const equipeLabel =
    equipeAtiva === 0
      ? "Convide quem atende com você"
      : `${equipeAtiva} ${equipeAtiva === 1 ? "profissional" : "profissionais"} na equipe` +
        (convitesPendentes > 0
          ? ` · ${convitesPendentes} ${convitesPendentes === 1 ? "convite pendente" : "convites pendentes"}`
          : "");

  const depositLabel =
    professional.depositType === "NONE"
      ? "Sem sinal"
      : professional.depositType === "FIXED"
        ? `Sinal de ${formatBRL(professional.depositValue)}`
        : `Sinal de ${professional.depositValue}%`;

  const statusAssinatura =
    STATUS_ASSINATURA_LABEL[professional.subscriptionStatus] ?? professional.subscriptionStatus;
  const validade =
    professional.subscriptionStatus === "TRIAL" && professional.trialEndsAt
      ? ` · teste até ${formatDate(professional.trialEndsAt, tz)}`
      : professional.subscriptionPaidUntil && professional.subscriptionStatus === "ATIVA"
        ? ` · até ${formatDate(professional.subscriptionPaidUntil, tz)}`
        : "";

  const estudio: Item[] = [
    {
      href: "/config/perfil",
      label: "Perfil do estúdio",
      description: professional.whatsapp
        ? `${professional.studioName} · ${formatPhone(professional.whatsapp)}`
        : "Nome, logo, contatos e as cores do seu link",
      icon: IconUser,
    },
    {
      href: "/config/equipe",
      label: "Equipe",
      description: equipeLabel,
      icon: IconTeam,
    },
    {
      href: "/assinatura",
      label: "Assinatura",
      description: `${statusAssinatura}${validade}`,
      icon: IconCard,
    },
    {
      href: "/config/senha",
      label: "Senha de acesso",
      description: "Troque a senha do seu login",
      icon: IconLock,
    },
  ];

  const atendimento: Item[] = [
    {
      href: "/config/horarios",
      label: "Horários de atendimento",
      description:
        activeDays > 0
          ? `${activeDays} ${activeDays === 1 ? "dia ativo" : "dias ativos"} por semana`
          : "Defina seus dias e horários",
      icon: IconClock,
    },
    {
      href: "/config/politicas",
      label: "Políticas de atendimento",
      description: `${depositLabel} · cancelamento até ${professional.cancellationWindowHours}h antes`,
      icon: IconShield,
    },
    {
      href: "/config/anamnese",
      label: "Anamnese",
      description: "As perguntas da ficha e quais viram alerta",
      icon: IconNote,
    },
    {
      href: "/config/calendario",
      label: "Agenda no calendário",
      description: professional.calendarToken
        ? "Ativa: seus horários aparecem no calendário do celular"
        : "Veja os horários no Google Agenda ou no iPhone",
      icon: IconCalendar,
    },
  ];

  const dinheiro: Item[] = [
    {
      href: "/config/taxas",
      label: "Taxas da maquininha",
      description:
        feeCount > 0
          ? `${feeCount} ${feeCount === 1 ? "forma configurada" : "formas configuradas"}`
          : "A taxa de cada forma de pagamento",
      icon: IconPercent,
    },
    {
      href: "/config/pagamentos",
      label: "Mercado Pago",
      description: professional.mpConnectedAt
        ? "Conectado: o sinal cai na sua conta e confirma sozinho"
        : "Conecte e receba o sinal direto na sua conta",
      icon: IconMoney,
    },
  ];

  const avisos: Item[] = [
    {
      href: "/config/notificacoes",
      label: "Notificações",
      description:
        pushDeviceCount > 0
          ? `Ativadas em ${pushDeviceCount} ${pushDeviceCount === 1 ? "aparelho" : "aparelhos"}`
          : "Receba o resumo do dia no celular",
      icon: IconBell,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Configurações"
        subtitle="Dados do estúdio, agenda, pagamentos e avisos em um só lugar."
        backHref="/mais"
        action={
          <div className="hidden sm:block">
            <SupportButton variant="button" />
          </div>
        }
      />

      {!professional.onboardingDone ? (
        <Card className="mb-6 p-5">
          <p className="text-[16px] font-bold tracking-[-0.015em] text-ink">Boas-vindas ao LashOS</p>
          <p className="mt-1 max-w-prose text-[14px] leading-relaxed text-ink-soft">
            Complete o seu perfil para as mensagens, o link de agendamento e o Pix do sinal saírem
            com os dados do seu estúdio. Leva uns 2 minutos.
          </p>
          <Link href="/config/perfil" className={buttonClasses("primary", "sm", "mt-4")}>
            Completar perfil
          </Link>
        </Card>
      ) : null}

      <div className="space-y-6">
        <Grupo titulo="Estúdio" itens={estudio} />
        <Grupo titulo="Agenda e atendimento" itens={atendimento} />
        <Grupo titulo="Dinheiro" itens={dinheiro} />
        <Grupo titulo="Avisos" itens={avisos} />
        <Card className="overflow-hidden sm:hidden">
          <SupportButton variant="row" />
        </Card>
      </div>
    </div>
  );
}
