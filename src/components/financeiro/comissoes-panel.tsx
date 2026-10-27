"use client";

/**
 * Aba "Comissões" (só a dona, com equipe): por funcionária no mês, quantos
 * atendimentos tiveram recebimento, o líquido que entrou, o % e a comissão a
 * pagar. Abrir a linha mostra o extrato. "Lançar pagamento" abre a despesa já
 * preenchida em Comissões da equipe — assim o pagamento sai do resultado.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { IconCheckCircle, IconChevronDown, IconInfo, IconPercent } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/money";
import { ExpenseSheet } from "./expense-sheet";
import { ExtratoList } from "./extrato-list";
import { plural } from "./format";
import { ProAvatar } from "./pro-avatar";
import type { ComissaoMembro, ExpensePreset } from "./types";

function Pagamento({
  membro,
  onLancar,
}: {
  membro: ComissaoMembro;
  onLancar: (preset: ExpensePreset) => void;
}) {
  if (membro.comissaoCents <= 0) return null;
  const restante = Math.max(0, membro.comissaoCents - membro.pagoCents);
  const preset: ExpensePreset = {
    description: membro.descricaoPagamento,
    category: "COMISSOES",
    amountCents: restante,
    note: `Pagamento da comissão de ${membro.name}. Entra em Comissões da equipe.`,
  };

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[16px] bg-surface-sunken px-3.5 py-3">
      {restante === 0 ? (
        <p className="flex items-center gap-2 text-[13px] font-medium text-success">
          <IconCheckCircle width={17} height={17} className="shrink-0" />
          Pagamento lançado: {formatBRL(membro.pagoCents)}
        </p>
      ) : (
        <>
          <p className="min-w-0 grow text-[13px] leading-snug text-ink-soft">
            {membro.pagoCents > 0
              ? `Já lançado ${formatBRL(membro.pagoCents)}. Faltam ${formatBRL(restante)}.`
              : "Pagou? Lance como despesa em Comissões da equipe."}
          </p>
          <Button size="sm" variant="secondary" onClick={() => onLancar(preset)}>
            {membro.pagoCents > 0 ? "Lançar o restante" : "Lançar pagamento"}
          </Button>
        </>
      )}
    </div>
  );
}

export function ComissoesPanel({
  membros,
  monthLabel,
  todayKey,
}: {
  membros: ComissaoMembro[];
  monthLabel: string;
  todayKey: string;
}) {
  const [aberto, setAberto] = useState<string | null>(
    membros.length === 1 ? membros[0].key : null,
  );
  const [preset, setPreset] = useState<ExpensePreset | null>(null);

  const totalComissao = membros.reduce((s, m) => s + m.comissaoCents, 0);
  const totalRecebido = membros.reduce((s, m) => s + m.recebidoCents, 0);
  const totalLancado = membros.reduce((s, m) => s + Math.min(m.pagoCents, m.comissaoCents), 0);
  const faltaLancar = totalComissao - totalLancado;
  const situacao =
    totalComissao === 0
      ? "Nada a pagar neste mês"
      : faltaLancar === 0
        ? "Tudo lançado como despesa"
        : totalLancado > 0
          ? `Faltam ${formatBRL(faltaLancar)} para lançar`
          : `Sobre ${formatBRL(totalRecebido)} recebidos`;
  const algumMovimento = membros.some((m) => m.linhas.length > 0 || m.aguardando.length > 0);

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader
          title={`Comissões de ${monthLabel.toLowerCase()}`}
          description="Sobre o líquido que entrou dos atendimentos de cada uma, pelo % gravado no agendamento."
        />

        {!algumMovimento ? (
          <EmptyState
            icon={<IconPercent />}
            title="Nenhuma comissão neste mês"
            description="Quando entrar pagamento de atendimentos da equipe, a comissão de cada uma aparece aqui."
          />
        ) : (
          <ul className="divide-y divide-line">
            {membros.map((m) => {
              const expandivel = m.linhas.length > 0 || m.aguardando.length > 0;
              const estaAberto = expandivel && aberto === m.key;
              const painelId = `comissao-${m.key}`;
              const resumo = (
                <>
                  <ProAvatar initials={m.initials} color={m.color} size={36} />
                  <span className="min-w-0 grow">
                    <span className="block truncate text-[15px] font-semibold text-ink">{m.name}</span>
                    <span className="block text-[12.5px] text-ink-soft">
                      {m.inactive ? "Desativada · " : ""}
                      {plural(m.atendimentos, "atendimento", "atendimentos")} · {m.pctLabel}
                      {m.aguardando.length > 0 ? (
                        <span className="text-warning"> · {m.aguardando.length} a lançar</span>
                      ) : null}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[15px] font-bold tabular-nums text-ink">
                      {formatBRL(m.comissaoCents)}
                    </span>
                    <span className="block text-[12px] tabular-nums text-ink-soft">
                      de {formatBRL(m.recebidoCents)}
                    </span>
                  </span>
                </>
              );
              return (
                <li key={m.key}>
                  {expandivel ? (
                    <button
                      type="button"
                      aria-expanded={estaAberto}
                      aria-controls={estaAberto ? painelId : undefined}
                      onClick={() => setAberto(estaAberto ? null : m.key)}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-muted sm:px-5"
                    >
                      {resumo}
                      <IconChevronDown
                        width={16}
                        height={16}
                        className={cn(
                          "shrink-0 text-ink-faint transition-transform duration-200",
                          estaAberto && "rotate-180",
                        )}
                      />
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                      {resumo}
                      <span aria-hidden className="w-4 shrink-0" />
                    </div>
                  )}

                  {estaAberto ? (
                    <div id={painelId} className="px-4 pb-4 sm:px-5">
                      <div className="rounded-[18px] border border-line px-3.5 py-1.5">
                        <ExtratoList linhas={m.linhas} aguardando={m.aguardando} />
                      </div>
                      <Pagamento membro={m} onLancar={setPreset} />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-line bg-surface-muted px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold text-ink">Comissões do mês</p>
            <p
              className={cn(
                "text-[12px] tabular-nums",
                faltaLancar === 0 && totalComissao > 0 ? "font-medium text-success" : "text-ink-soft",
              )}
            >
              {situacao}
            </p>
          </div>
          <p className="shrink-0 text-[18px] font-bold tracking-[-0.02em] tabular-nums text-ink">
            {formatBRL(totalComissao)}
          </p>
        </div>
      </Card>

      <p className="mt-3 flex items-start gap-2 px-1 text-[12.5px] leading-snug text-ink-soft">
        <IconInfo width={16} height={16} className="mt-px shrink-0" />
        Toque em cada uma para ver os atendimentos e lançar o pagamento, já preenchido, como
        despesa em Comissões da equipe.
      </p>

      {preset ? (
        <ExpenseSheet
          expense={null}
          preset={preset}
          defaultDateKey={todayKey}
          onClose={() => setPreset(null)}
        />
      ) : null}
    </>
  );
}
