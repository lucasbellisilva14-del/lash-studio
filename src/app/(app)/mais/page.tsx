import Link from "next/link";
import { requireProfessional, requireViewer } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { SupportButton } from "@/components/shell/support";
import { sairDaConta } from "@/components/shell/sign-out-action";
import {
  IconBox,
  IconCalculator,
  IconChart,
  IconChevronRight,
  IconLock,
  IconLogout,
  IconMoney,
  IconScissors,
  IconSettings,
  IconTrophy,
} from "@/components/ui/icons";

export const metadata = { title: "Mais" };

const gestao = [
  { href: "/servicos", label: "Serviços", description: "Preço, duração e sinal de cada serviço", icon: IconScissors },
  { href: "/estoque", label: "Estoque", description: "Insumos, colas abertas e validades", icon: IconBox },
  { href: "/relatorios", label: "Relatórios", description: "Clientes, serviços, demanda e origens", icon: IconChart },
  { href: "/ferramentas", label: "Ferramentas", description: "Calculadora de cobrança e quanto vale sua hora", icon: IconCalculator },
  { href: "/conquistas", label: "Conquistas", description: "Seu nível, medalhas e desafios da semana", icon: IconTrophy },
];

function Row({
  href,
  label,
  description,
  icon: Icon,
}: {
  href: string;
  label: string;
  description: string;
  icon: typeof IconBox;
}) {
  return (
    <Link href={href} className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-surface-muted transition-colors">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-soft">
        <Icon width={18} height={18} />
      </span>
      <span className="min-w-0 grow">
        <span className="block text-[15px] font-semibold text-ink">{label}</span>
        <span className="block truncate text-[13px] text-ink-soft">{description}</span>
      </span>
      <IconChevronRight className="shrink-0 text-ink-faint" width={18} height={18} />
    </Link>
  );
}

function SairDaConta() {
  return (
    <form action={sairDaConta} className="mt-6">
      <button
        type="submit"
        className="mx-auto flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-semibold text-ink-soft hover:bg-danger-soft hover:text-danger transition-colors"
      >
        <IconLogout width={18} height={18} />
        Sair da conta
      </button>
    </form>
  );
}

export default async function MaisPage() {
  const viewer = await requireViewer();
  const professional = await requireProfessional();

  // Funcionária: os números dela, a senha, o suporte e sair. Nada de gestão do estúdio.
  if (!viewer.isOwner) {
    return (
      <div>
        <PageHeader title={professional.studioName} subtitle={`${viewer.name} · Equipe`} />

        <Card className="divide-y divide-line overflow-hidden">
          <Row
            href="/financeiro"
            label="Meus números"
            description="Seus atendimentos, recebimentos e comissão"
            icon={IconMoney}
          />
          <Row
            href="/config/senha"
            label="Sua senha"
            description="Troque a senha do seu login"
            icon={IconLock}
          />
          <SupportButton variant="row" />
        </Card>

        <SairDaConta />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={professional.studioName} subtitle={professional.name} />

      <Card className="divide-y divide-line overflow-hidden">
        {gestao.map((item) => (
          <Row key={item.href} {...item} />
        ))}
      </Card>

      <Card className="mt-4 divide-y divide-line overflow-hidden">
        <Row
          href="/config"
          label="Configurações"
          description="Perfil, equipe, horários, políticas e pagamentos"
          icon={IconSettings}
        />
        <SupportButton variant="row" />
      </Card>

      <SairDaConta />
    </div>
  );
}
