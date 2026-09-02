import Link from "next/link";
import { requireProfessional } from "@/lib/session";
import { signOut } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import {
  IconBox,
  IconChart,
  IconChevronRight,
  IconLogout,
  IconScissors,
  IconSettings,
  IconTrophy,
} from "@/components/ui/icons";

export const metadata = { title: "Mais" };

const links = [
  { href: "/conquistas", label: "Conquistas", description: "Seu nível, medalhas e desafios da semana", icon: IconTrophy },
  { href: "/servicos", label: "Serviços", description: "Catálogo, preços e durações", icon: IconScissors },
  { href: "/estoque", label: "Estoque", description: "Insumos, colas e validades", icon: IconBox },
  { href: "/relatorios", label: "Relatórios", description: "Clientes, serviços e origens", icon: IconChart },
  { href: "/config", label: "Configurações", description: "Perfil, horários e políticas", icon: IconSettings },
];

export default async function MaisPage() {
  const professional = await requireProfessional();

  return (
    <div>
      <PageHeader title={professional.studioName} subtitle={professional.name} />
      <Card className="divide-y divide-line overflow-hidden">
        {links.map(({ href, label, description, icon: Icon }) => (
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
              <span className="block text-[13px] text-ink-soft truncate">{description}</span>
            </span>
            <IconChevronRight className="text-ink-faint shrink-0" width={18} height={18} />
          </Link>
        ))}
      </Card>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
        className="mt-6"
      >
        <button
          type="submit"
          className="flex items-center gap-2 mx-auto text-sm font-medium text-ink-soft hover:text-danger transition-colors py-2 px-3"
        >
          <IconLogout width={18} height={18} />
          Sair da conta
        </button>
      </form>
    </div>
  );
}
