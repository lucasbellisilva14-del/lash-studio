"use client";

/** Menu lateral do PC (lg+): ícone e nome, painel branco flutuante. */
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBox,
  IconCalculator,
  IconCalendar,
  IconChart,
  IconChat,
  IconCheck,
  IconHome,
  IconLink,
  IconLogout,
  IconMoney,
  IconScissors,
  IconSettings,
  IconTrophy,
  IconUsers,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { sairDaConta } from "./sign-out-action";
import { SupportButton } from "./support";

/** Quem está logada (dados mínimos para o menu). memberId nulo = a dona. */
export type ShellViewer = {
  isOwner: boolean;
  name: string;
  memberId: string | null;
};

const PRINCIPAL = [
  { href: "/", label: "Hoje", icon: IconHome },
  { href: "/agenda", label: "Agenda", icon: IconCalendar },
  { href: "/clientes", label: "Clientes", icon: IconUsers },
  { href: "/mensagens", label: "Fila", icon: IconChat },
  { href: "/financeiro", label: "Financeiro", icon: IconMoney },
] as const;

/** Funcionária: o dia, a agenda, as clientes e a fila dela, e os números dela. */
const PRINCIPAL_EQUIPE = [
  { href: "/", label: "Hoje", icon: IconHome },
  { href: "/agenda", label: "Agenda", icon: IconCalendar },
  { href: "/clientes", label: "Clientes", icon: IconUsers },
  { href: "/mensagens", label: "Fila", icon: IconChat },
  { href: "/financeiro", label: "Meus números", icon: IconMoney },
] as const;

const GESTAO = [
  { href: "/servicos", label: "Serviços", icon: IconScissors },
  { href: "/estoque", label: "Estoque", icon: IconBox },
  { href: "/relatorios", label: "Relatórios", icon: IconChart },
  { href: "/ferramentas", label: "Ferramentas", icon: IconCalculator },
  { href: "/conquistas", label: "Conquistas", icon: IconTrophy },
] as const;

function ativo(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof IconHome;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-10 items-center gap-3 rounded-full px-3.5 text-[14px] font-semibold transition-colors",
        active ? "bg-accent text-accent-ink" : "text-ink-soft hover:bg-surface-sunken hover:text-ink",
      )}
    >
      <Icon width={19} height={19} strokeWidth={active ? 1.8 : 1.5} />
      {label}
    </Link>
  );
}

export function Sidebar({
  studioName,
  professionalName,
  logoUrl,
  slug,
  viewer = { isOwner: true, name: professionalName, memberId: null },
  noLink = true,
}: {
  studioName: string;
  /** Nome da dona do estúdio. */
  professionalName: string;
  logoUrl: string | null;
  slug: string;
  viewer?: ShellViewer;
  /** A funcionária atende pelo link público? (senão, não há "meu link") */
  noLink?: boolean;
}) {
  const pathname = usePathname();
  const [copiado, setCopiado] = useState(false);

  const equipe = !viewer.isOwner;
  const principal = equipe ? PRINCIPAL_EQUIPE : PRINCIPAL;
  // A dona copia o link do estúdio; a funcionária, o link que já abre com ela.
  const linkPath = !equipe
    ? `/agendar/${slug}`
    : noLink && viewer.memberId
      ? `/agendar/${slug}?com=${encodeURIComponent(viewer.memberId)}`
      : null;

  async function copiarLink() {
    if (!linkPath) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${linkPath}`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {
      // clipboard indisponível — sem drama
    }
  }

  return (
    <aside className="hidden lg:block w-[256px] shrink-0">
      <div className="sticky top-0 h-dvh p-3">
        <div className="flex h-full flex-col rounded-[24px] bg-surface shadow-[var(--shadow-card)] ring-1 ring-[rgb(23_21_30/0.04)]">
          {/* Identidade do estúdio */}
          <div className="flex items-center gap-3 px-4 pt-5 pb-4">
            {logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logoUrl}
                alt=""
                className="h-10 w-10 rounded-[12px] object-cover ring-1 ring-line bg-surface"
              />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-accent text-accent-ink font-bold text-[16px]">
                {studioName.trim().charAt(0).toUpperCase() || "L"}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[14.5px] font-bold leading-5 tracking-[-0.015em] text-ink">
                {studioName}
              </p>
              <p className="truncate text-[12px] text-ink-soft">
                {equipe ? `${viewer.name} · Equipe` : professionalName}
              </p>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3" aria-label="Navegação principal">
            <div className="space-y-0.5">
              {principal.map((item) => (
                <NavItem key={item.href} {...item} active={ativo(pathname, item.href)} />
              ))}
            </div>
            {equipe ? null : (
              <>
                <div className="mx-3.5 my-3 h-px bg-line" />
                <div className="space-y-0.5">
                  {GESTAO.map((item) => (
                    <NavItem key={item.href} {...item} active={ativo(pathname, item.href)} />
                  ))}
                </div>
              </>
            )}
          </nav>

          <div className="space-y-0.5 px-3 pt-3 pb-3">
            <NavItem
              href="/config"
              label="Configurações"
              icon={IconSettings}
              active={ativo(pathname, "/config")}
            />
            <SupportButton variant="nav" />
            {linkPath ? (
              <button
                type="button"
                onClick={copiarLink}
                className="flex h-10 w-full items-center gap-3 rounded-full px-3.5 text-left text-[14px] font-semibold text-ink-soft hover:bg-surface-sunken hover:text-ink transition-colors"
              >
                {copiado ? (
                  <IconCheck width={19} height={19} className="text-success" />
                ) : (
                  <IconLink width={19} height={19} />
                )}
                {copiado ? "Link copiado" : "Copiar meu link"}
              </button>
            ) : null}
            <form action={sairDaConta}>
              <button
                type="submit"
                className="flex h-10 w-full items-center gap-3 rounded-full px-3.5 text-[14px] font-semibold text-ink-soft hover:bg-danger-soft hover:text-danger transition-colors"
              >
                <IconLogout width={19} height={19} />
                Sair da conta
              </button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  );
}
