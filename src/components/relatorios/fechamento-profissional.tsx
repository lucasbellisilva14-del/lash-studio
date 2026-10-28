/**
 * Documento "Fechamento de {mês} · {nome}" (tela e impressão): resumo da
 * comissão, atendimentos com recebimento no mês, indicadores do mês e, para a
 * equipe, o comprovante de pagamento com linhas de assinatura e data.
 * Só apresentação: os números chegam prontos (app/(app)/relatorios/mensal).
 */
import { formatBRL } from "@/lib/money";
import { formatSignedBRL, plural } from "@/components/financeiro/format";
import {
  DocCabecalho,
  DocFolha,
  DocNumero,
  DocRodape,
  DocSecao,
} from "@/components/relatorios/fechamento-doc";
import { IndicadoresDoc, type IndicadorItem } from "@/components/relatorios/indicadores";

export type FechamentoLinha = {
  id: string;
  /** "dd/MM" */
  dataLabel: string;
  clientName: string;
  serviceName: string;
  recebidoCents: number;
  comissaoCents: number;
  /** Concluído e ainda sem o recebimento do atendimento. */
  faltaCents: number;
};

export type FechamentoDaProfissionalDoc = {
  studioName: string;
  logoUrl: string | null;
  /** "Fechamento de outubro de 2026 · Ana Souza" */
  subtitulo: string;
  /** "dd/MM/yyyy" */
  emitidoEm: string;
  /** "outubro de 2026" */
  mesExtenso: string;
  /** Nome completo (linha de assinatura). */
  nome: string;
  /** Funcionária (tem comissão e comprovante); falso = a dona. */
  daEquipe: boolean;
  concluidos: number;
  recebidoCents: number;
  comissaoCents: number;
  ficaCents: number;
  /** "40%", "variável" ou nulo (sem % conhecido). */
  pct: string | null;
  linhas: FechamentoLinha[];
  /** Concluídos no mês sem nenhum recebimento ainda. */
  aguardando: { quantidade: number; pendenteCents: number };
  indicadores: IndicadorItem[];
};

export function DocumentoDaProfissional({ doc }: { doc: FechamentoDaProfissionalDoc }) {
  const { daEquipe, pct, linhas, mesExtenso } = doc;

  return (
    <DocFolha>
      <DocCabecalho
        studioName={doc.studioName}
        logoUrl={doc.logoUrl}
        subtitulo={doc.subtitulo}
        emitidoEm={doc.emitidoEm}
      />

      {/* Resumo: celular 2 colunas; tela larga e impressão 3, com a comissão em destaque */}
      <section className="grid grid-cols-2 gap-3 py-5 sm:grid-cols-3 print:grid-cols-3">
        <DocNumero label="Atendimentos" value={String(doc.concluidos)} hint="Concluídos no mês" />
        <DocNumero
          label="Recebido líquido"
          value={formatBRL(doc.recebidoCents)}
          hint="Dos atendimentos, já sem as taxas"
        />
        <DocNumero
          label="% de comissão"
          value={daEquipe ? (pct === "variável" ? "Variável" : (pct ?? "—")) : "—"}
          hint={
            daEquipe
              ? pct === "variável"
                ? "Mudou no mês: vale o % gravado em cada atendimento"
                : "Sobre o líquido de cada atendimento"
              : "Você não tem comissão"
          }
        />
        <DocNumero label="Fica para o estúdio" value={formatSignedBRL(doc.ficaCents)} hint="Recebido − comissão" />
        <DocNumero
          label="Comissão a pagar"
          value={daEquipe ? formatBRL(doc.comissaoCents) : "—"}
          hint={
            !daEquipe
              ? "Tudo o que entrou fica no estúdio"
              : pct && pct !== "variável"
                ? `${pct} de ${formatBRL(doc.recebidoCents)} recebidos`
                : `Sobre ${formatBRL(doc.recebidoCents)} recebidos`
          }
          destaque={daEquipe}
          className="col-span-2"
        />
      </section>

      <DocSecao title="Atendimentos do mês" description={`Pagamentos lançados em ${mesExtenso}: a base da comissão.`}>
        {linhas.length === 0 ? (
          <p className="text-sm text-ink-soft">Nenhum pagamento de atendimento lançado em {mesExtenso}.</p>
        ) : (
          <>
            {/* Celular: um bloco por atendimento */}
            <ul className="divide-y divide-line/70 sm:hidden print:hidden">
              {linhas.map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{l.clientName}</p>
                    <p className="truncate text-xs text-ink-soft">
                      {l.dataLabel} · {l.serviceName}
                    </p>
                    {l.faltaCents > 0 ? (
                      <p className="text-xs text-warning">Falta lançar {formatBRL(l.faltaCents)}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium tabular-nums text-ink">{formatBRL(l.recebidoCents)}</p>
                    {daEquipe ? (
                      <p className="text-xs tabular-nums text-ink-soft">comissão {formatBRL(l.comissaoCents)}</p>
                    ) : null}
                  </div>
                </li>
              ))}
              <li className="flex items-start justify-between gap-3 pt-2.5 text-sm font-semibold text-ink">
                <span>Total</span>
                <span className="text-right tabular-nums">
                  {formatBRL(doc.recebidoCents)}
                  {daEquipe ? (
                    <span className="block text-xs font-medium text-ink-soft">
                      comissão {formatBRL(doc.comissaoCents)}
                    </span>
                  ) : null}
                </span>
              </li>
            </ul>

            {/* Tela larga e impressão: tabela */}
            <table className="hidden w-full text-sm sm:table print:table">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  <th className="pb-1.5 pr-3 font-semibold">Data</th>
                  <th className="pb-1.5 pr-3 font-semibold">Cliente</th>
                  <th className="pb-1.5 pr-3 font-semibold">Serviço</th>
                  <th className="pb-1.5 font-semibold text-right">Recebido</th>
                  {daEquipe ? <th className="pb-1.5 pl-3 font-semibold text-right">Comissão</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {linhas.map((l) => (
                  <tr key={l.id} className="break-inside-avoid align-top">
                    <td className="py-1.5 pr-3 whitespace-nowrap tabular-nums text-ink-soft">{l.dataLabel}</td>
                    <td className="py-1.5 pr-3 text-ink">
                      {l.clientName}
                      {l.faltaCents > 0 ? (
                        <span className="block text-xs text-warning">Falta lançar {formatBRL(l.faltaCents)}</span>
                      ) : null}
                    </td>
                    <td className="py-1.5 pr-3 text-ink-soft">{l.serviceName}</td>
                    <td className="py-1.5 whitespace-nowrap text-right font-medium tabular-nums text-ink">
                      {formatBRL(l.recebidoCents)}
                    </td>
                    {daEquipe ? (
                      <td className="py-1.5 pl-3 whitespace-nowrap text-right font-medium tabular-nums text-ink">
                        {formatBRL(l.comissaoCents)}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line font-semibold text-ink">
                  <td colSpan={3} className="pt-2 pr-3">
                    Total · {plural(linhas.length, "atendimento", "atendimentos")}
                  </td>
                  <td className="pt-2 whitespace-nowrap text-right tabular-nums">{formatBRL(doc.recebidoCents)}</td>
                  {daEquipe ? (
                    <td className="pt-2 pl-3 whitespace-nowrap text-right tabular-nums">
                      {formatBRL(doc.comissaoCents)}
                    </td>
                  ) : null}
                </tr>
              </tfoot>
            </table>
          </>
        )}

        {doc.aguardando.quantidade > 0 ? (
          <p className="mt-3 text-xs leading-snug text-ink-soft">
            {plural(doc.aguardando.quantidade, "atendimento concluído", "atendimentos concluídos")} no mês
            ainda sem pagamento lançado ({formatBRL(doc.aguardando.pendenteCents)}).{" "}
            {daEquipe
              ? "A comissão deles entra no fechamento do mês em que o pagamento for lançado."
              : "Eles entram no mês em que o pagamento for lançado."}
          </p>
        ) : null}
      </DocSecao>

      <DocSecao title="Indicadores do mês">
        <IndicadoresDoc itens={doc.indicadores} />
      </DocSecao>

      {daEquipe ? (
        <DocSecao title="Comprovante de pagamento" className="break-inside-avoid">
          {doc.comissaoCents > 0 ? (
            <>
              <p className="text-[15px] leading-relaxed text-ink">
                Recebi <strong className="font-semibold tabular-nums">{formatBRL(doc.comissaoCents)}</strong>{" "}
                referente à comissão de {mesExtenso}.
              </p>
              <div className="mt-12 grid gap-10 sm:grid-cols-[minmax(0,1fr)_11rem] print:grid-cols-[minmax(0,1fr)_11rem]">
                <div>
                  <div aria-hidden className="border-t border-ink/60" />
                  <p className="mt-1.5 text-xs text-ink-soft">{doc.nome}</p>
                </div>
                <div>
                  <div aria-hidden className="border-t border-ink/60" />
                  <p className="mt-1.5 text-xs text-ink-soft">Data</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-soft">Sem comissão a pagar em {mesExtenso}.</p>
          )}
        </DocSecao>
      ) : null}

      <DocRodape />
    </DocFolha>
  );
}
