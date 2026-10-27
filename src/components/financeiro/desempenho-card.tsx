import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { IconChevronRight } from "@/components/ui/icons";
import { formatBRL } from "@/lib/money";
import { formatSignedBRL, plural } from "./format";
import { ProAvatar } from "./pro-avatar";
import type { DesempenhoItem } from "./types";

/** Valor na caixa de 3 colunas do celular. */
const VALOR_ESTREITO =
  "whitespace-nowrap text-[length:clamp(11px,4.5cqi,13px)] leading-none tabular-nums text-ink";

/** Colunas da tabela larga (nome + 5 números + seta). */
const COLUNAS =
  "grid-cols-[minmax(0,1.6fr)_repeat(5,minmax(0,1fr))_16px] items-center gap-3";

function Valor({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <span
      className={`text-right text-[13px] tabular-nums text-ink ${strong ? "font-bold" : "font-medium"}`}
    >
      {children}
    </span>
  );
}

function Linha({ item }: { item: DesempenhoItem }) {
  const comissao = item.isOwner ? "—" : formatBRL(item.comissaoCents);
  const ticket = item.ticketMedioCents != null ? formatBRL(item.ticketMedioCents) : "—";
  const desativada = item.inactive ? <Badge tone="neutral">Desativada</Badge> : null;

  return (
    <>
      {/* Estreito: nome e contagem em cima, três valores embaixo */}
      <div className="px-4 py-3.5 sm:px-5 @3xl:hidden">
        <div className="flex items-center gap-3">
          <ProAvatar initials={item.initials} color={item.color} />
          <div className="min-w-0 grow">
            <p className="flex min-w-0 items-center gap-2">
              <span className="truncate text-[14.5px] font-semibold text-ink">{item.label}</span>
              {desativada}
            </p>
            <p className="text-[12.5px] text-ink-soft">
              {plural(item.concluidos, "concluído", "concluídos")} · ticket {ticket}
            </p>
          </div>
          {item.href ? (
            <IconChevronRight width={16} height={16} className="shrink-0 text-ink-faint" />
          ) : null}
        </div>
        {/* Valores encolhem com a caixa (cqi) para R$ 12.345,67 caber num celular de 360px. */}
        <dl className="@container mt-3 grid grid-cols-3 gap-2 rounded-[14px] bg-surface-sunken px-3 py-2.5">
          <div className="min-w-0">
            <dt className="text-[11.5px] leading-tight text-ink-soft">Recebido</dt>
            <dd className={`mt-1 font-semibold ${VALOR_ESTREITO}`}>{formatBRL(item.recebidoCents)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11.5px] leading-tight text-ink-soft">Comissão</dt>
            <dd className={`mt-1 font-semibold ${VALOR_ESTREITO}`}>{comissao}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11.5px] leading-tight text-ink-soft">Fica no estúdio</dt>
            <dd className={`mt-1 font-bold ${VALOR_ESTREITO}`}>{formatSignedBRL(item.ficaCents)}</dd>
          </div>
        </dl>
      </div>

      {/* Largo: uma linha de tabela */}
      <div className={`hidden px-5 py-3 @3xl:grid ${COLUNAS}`}>
        <span className="flex min-w-0 items-center gap-2.5">
          <ProAvatar initials={item.initials} color={item.color} size={28} />
          <span className="truncate text-[14px] font-semibold text-ink">{item.label}</span>
          {desativada}
        </span>
        <Valor>{item.concluidos}</Valor>
        <Valor>{formatBRL(item.recebidoCents)}</Valor>
        <Valor>{ticket}</Valor>
        <Valor>{comissao}</Valor>
        <Valor strong>{formatSignedBRL(item.ficaCents)}</Valor>
        {item.href ? (
          <IconChevronRight width={16} height={16} className="text-ink-faint" />
        ) : (
          <span />
        )}
      </div>
    </>
  );
}

/**
 * "Desempenho da equipe" (só com equipe, em "Estúdio todo"): uma linha por
 * profissional; tocar aplica o filtro dela na tela.
 */
export function DesempenhoCard({ items, monthLabel }: { items: DesempenhoItem[]; monthLabel: string }) {
  return (
    <Card className="@container overflow-hidden">
      <CardHeader
        title="Desempenho da equipe"
        description={`Concluídos e recebido em ${monthLabel.toLowerCase()}. Toque para ver os números de cada uma.`}
      />
      <div
        aria-hidden
        className={`hidden border-b border-line px-5 py-2.5 text-[11px] font-semibold uppercase leading-tight tracking-[0.08em] text-ink-faint @3xl:grid ${COLUNAS}`}
      >
        <span>Profissional</span>
        <span className="text-right">Concluídos</span>
        <span className="text-right">Recebido</span>
        <span className="text-right">Ticket médio</span>
        <span className="text-right">Comissão</span>
        <span className="text-right">Fica no estúdio</span>
        <span />
      </div>
      <ul className="divide-y divide-line">
        {items.map((item) => (
          <li key={item.key}>
            {item.href ? (
              <Link
                href={item.href}
                className="block transition-colors hover:bg-surface-muted active:bg-surface-sunken"
              >
                <Linha item={item} />
              </Link>
            ) : (
              <Linha item={item} />
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
