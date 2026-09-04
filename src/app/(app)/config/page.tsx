import Link from "next/link";
import { requireProfessional } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { IconBell, IconChevronRight, IconClock, IconLock } from "@/components/ui/icons";
import { IconPercent, IconShield, IconUser } from "@/components/config/icons";

export const metadata = { title: "Configurações" };

export default async function ConfigPage() {
  const professional = await requireProfessional();

  const [activeDays, feeCount, pushDeviceCount] = await Promise.all([
    prisma.workingHour.count({
      where: { professionalId: professional.id, active: true },
    }),
    prisma.paymentMethodFee.count({
      where: { professionalId: professional.id },
    }),
    prisma.pushSubscription.count({
      where: { professionalId: professional.id },
    }),
  ]);

  const depositLabel =
    professional.depositType === "NONE"
      ? "Sem sinal"
      : professional.depositType === "FIXED"
        ? `Sinal de ${formatBRL(professional.depositValue)}`
        : `Sinal de ${professional.depositValue}%`;

  const items = [
    {
      href: "/config/perfil",
      label: "Perfil do estúdio",
      description: professional.whatsapp
        ? `${professional.studioName} · ${formatPhone(professional.whatsapp)}`
        : "Nome, logo, cor do app e contatos",
      icon: IconUser,
    },
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
      href: "/config/taxas",
      label: "Taxas da maquininha",
      description:
        feeCount > 0
          ? `${feeCount} ${feeCount === 1 ? "forma configurada" : "formas configuradas"}`
          : "Configure a taxa de cada forma de pagamento",
      icon: IconPercent,
    },
    {
      href: "/config/senha",
      label: "Senha de acesso",
      description: "Troque a senha do seu login",
      icon: IconLock,
    },
    {
      href: "/config/notificacoes",
      label: "Notificações",
      description:
        pushDeviceCount > 0
          ? `Ativadas em ${pushDeviceCount} ${pushDeviceCount === 1 ? "aparelho" : "aparelhos"}`
          : "Receba o resumo do dia no celular",
      icon: IconBell,
    },
  ] as const;

  return (
    <div>
      <PageHeader
        title="Configurações"
        subtitle="Deixe o LashOS com a cara do seu estúdio"
        backHref="/mais"
      />

      {!professional.onboardingDone ? (
        <Card className="mb-4 bg-accent-soft border-accent/25">
          <CardBody>
            <p className="font-display text-lg font-semibold text-ink">
              Boas-vindas ao LashOS
            </p>
            <p className="text-sm text-ink-soft mt-1 leading-relaxed">
              Complete o seu perfil para deixar mensagens, agendamentos e o app
              inteiro com a identidade do seu estúdio. Leva menos de 2 minutos.
            </p>
            <Link
              href="/config/perfil"
              className="inline-flex items-center justify-center h-11 px-4 mt-3 rounded-xl bg-accent text-accent-ink text-[15px] font-medium shadow-sm hover:bg-accent-strong transition-colors"
            >
              Completar perfil
            </Link>
          </CardBody>
        </Card>
      ) : null}

      <Card className="divide-y divide-line overflow-hidden">
        {items.map(({ href, label, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-background transition-colors"
          >
            <span className="h-10 w-10 rounded-xl bg-accent-soft text-accent-strong flex items-center justify-center shrink-0">
              <Icon />
            </span>
            <span className="grow min-w-0">
              <span className="block font-medium text-[15px] text-ink">{label}</span>
              <span className="block text-[13px] text-ink-soft truncate">
                {description}
              </span>
            </span>
            <IconChevronRight className="text-ink-faint shrink-0" width={18} height={18} />
          </Link>
        ))}
      </Card>

      <p className="text-xs text-ink-faint text-center mt-5 leading-relaxed">
        Essas configurações valem para agendamentos, mensagens automáticas
        e cálculos do financeiro.
      </p>
    </div>
  );
}
