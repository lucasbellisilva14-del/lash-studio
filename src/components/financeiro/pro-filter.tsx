import { chipLinkClasses } from "./period-bar";
import { PendingLink } from "./pending-link";
import { ProDot } from "./pro-avatar";

export type ProFilterOption = {
  key: string;
  label: string;
  /** Sem cor = "Estúdio todo". */
  color: string | null;
  href: string;
  selected: boolean;
};

/** Filtro "Estúdio todo · Você · Ana · Bia" (só com equipe). Rola de lado no celular. */
export function ProFilter({ options }: { options: ProFilterOption[] }) {
  return (
    <nav
      aria-label="Filtrar por profissional"
      className="-mx-4 overflow-x-auto px-4 no-scrollbar lg:mx-0 lg:px-0"
    >
      <ul className="flex w-max gap-2">
        {options.map((opt) => (
          <li key={opt.key}>
            <PendingLink
              href={opt.href}
              aria-current={opt.selected ? "true" : undefined}
              className={chipLinkClasses(opt.selected)}
            >
              {opt.color ? <ProDot color={opt.color} onAccent={opt.selected} /> : null}
              {opt.label}
            </PendingLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
