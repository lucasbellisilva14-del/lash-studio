import Link from "next/link";
import { IconChevronRight } from "@/components/ui/icons";
import { formatBRL } from "@/lib/money";
import type { AguardandoLinha, ExtratoLinha } from "./types";

/**
 * Extrato de comissão: os atendimentos que tiveram recebimento no mês (data,
 * cliente, serviço, valor que entrou e a comissão) e, à parte, os concluídos
 * que ainda esperam o pagamento ser lançado na ficha. Serve à aba Comissões e
 * a "Meus números". Cada linha abre a ficha do atendimento.
 */
export function ExtratoList({
  linhas,
  aguardando,
  showComissao = true,
}: {
  linhas: ExtratoLinha[];
  aguardando: AguardandoLinha[];
  showComissao?: boolean;
}) {
  return (
    <div>
      {linhas.length > 0 ? (
        <ul className="divide-y divide-line">
          {linhas.map((l) => (
            <li key={l.id}>
              <Link
                href={l.href}
                className="-mx-2 flex items-center gap-3 rounded-[12px] px-2 py-2.5 transition-colors hover:bg-surface-muted active:bg-surface-sunken"
              >
                <span className="w-11 shrink-0 text-[12.5px] font-semibold tabular-nums text-ink-soft">
                  {l.dateLabel}
                </span>
                <span className="min-w-0 grow">
                  <span className="block truncate text-[14px] font-semibold text-ink">{l.clientName}</span>
                  <span className="block truncate text-[12.5px] text-ink-soft">{l.serviceName}</span>
                  {l.faltaCents > 0 ? (
                    <span className="mt-0.5 block text-[12px] font-medium text-warning">
                      Falta lançar {formatBRL(l.faltaCents)}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-right">
                  {showComissao ? (
                    <>
                      <span className="block text-[14px] font-bold tabular-nums text-ink">
                        {formatBRL(l.comissaoCents)}
                      </span>
                      <span className="block text-[12px] tabular-nums text-ink-soft">
                        de {formatBRL(l.recebidoCents)}
                      </span>
                    </>
                  ) : (
                    <span className="block text-[14px] font-bold tabular-nums text-ink">
                      {formatBRL(l.recebidoCents)}
                    </span>
                  )}
                </span>
                <IconChevronRight width={15} height={15} className="shrink-0 text-ink-faint" />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {aguardando.length > 0 ? (
        <div className={linhas.length > 0 ? "mt-3 border-t border-line pt-3" : undefined}>
          <p className="text-[13px] font-semibold text-ink">Aguardando pagamento</p>
          <p className="text-[12.5px] leading-snug text-ink-soft">
            Concluídos sem recebimento lançado. Entram na comissão quando o pagamento for lançado
            na ficha.
          </p>
          <ul className="mt-1.5 divide-y divide-line">
            {aguardando.map((a) => (
              <li key={a.id}>
                <Link
                  href={a.href}
                  className="-mx-2 flex items-center gap-3 rounded-[12px] px-2 py-2.5 transition-colors hover:bg-surface-muted active:bg-surface-sunken"
                >
                  <span className="w-11 shrink-0 text-[12.5px] font-semibold tabular-nums text-ink-soft">
                    {a.dateLabel}
                  </span>
                  <span className="min-w-0 grow">
                    <span className="block truncate text-[14px] font-semibold text-ink">{a.clientName}</span>
                    <span className="block truncate text-[12.5px] text-ink-soft">{a.serviceName}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[14px] font-semibold tabular-nums text-ink-soft">
                      {formatBRL(a.pendenteCents)}
                    </span>
                    <span className="block text-[12px] font-medium text-warning">a lançar</span>
                  </span>
                  <IconChevronRight width={15} height={15} className="shrink-0 text-ink-faint" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
