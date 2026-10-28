/**
 * Fechamento do mês de uma profissional (a dona também): busca e conta; o
 * documento é components/relatorios/fechamento-profissional.
 * Números pelas regras do Financeiro: batem com a aba Comissões do mesmo mês.
 */
import type { Professional } from "@prisma/client";
import { dayKeyToUtcStart, formatWithPattern, localDayKey } from "@/lib/dates";
import { DocumentoDaProfissional } from "@/components/relatorios/fechamento-profissional";
import { itensDosIndicadores } from "@/components/relatorios/indicadores";
import { STATUS_COM_RECEBIMENTO } from "@/app/(app)/financeiro/data";
import { resumoProfissional } from "@/app/(app)/financeiro/numeros";
import { buscarFechamentoDaProfissional, type ProRelatorio } from "../data";
import { extratoDoFechamento, rotuloDoPct } from "../fechamento";
import { indicadoresDaProfissional, type Janela } from "../indicadores";

export async function FechamentoDaProfissional({
  professional,
  pro,
  janela,
  agora,
  mesExtenso,
}: {
  professional: Professional;
  pro: ProRelatorio;
  /** O mês: [1º dia, 1º dia do mês seguinte) no fuso do estúdio. */
  janela: Janela;
  agora: Date;
  /** "outubro de 2026" */
  mesExtenso: string;
}) {
  const tz = professional.timezone;
  const { txs, appts, base } = await buscarFechamentoDaProfissional(
    professional.id,
    janela,
    agora,
    pro.memberId,
  );

  // Comissão e extrato: o mesmo recorte do Financeiro (agendamentos que geram recebimento).
  const comRecebimento = appts.filter((a) => STATUS_COM_RECEBIMENTO.includes(a.status));
  const inicioDeHoje = dayKeyToUtcStart(localDayKey(agora, tz), tz);
  const resumo = resumoProfissional(txs, comRecebimento, pro.memberId, inicioDeHoje);
  const extrato = extratoDoFechamento(pro.memberId, txs, comRecebimento);
  const indicadores = indicadoresDaProfissional({
    memberId: pro.memberId,
    agendamentos: appts,
    base,
    janela,
    agora,
    tz,
  });
  const daEquipe = !pro.isOwner;

  return (
    <DocumentoDaProfissional
      doc={{
        studioName: professional.studioName,
        logoUrl: professional.logoUrl,
        subtitulo: `Fechamento de ${mesExtenso} · ${pro.name}`,
        emitidoEm: formatWithPattern(agora, "dd/MM/yyyy", tz),
        mesExtenso,
        nome: pro.name,
        daEquipe,
        concluidos: resumo.concluidos,
        recebidoCents: resumo.recebidoCents,
        comissaoCents: resumo.comissaoCents,
        ficaCents: resumo.ficaCents,
        // % de hoje só para quem ainda está na equipe (quem saiu: só o gravado nos atendimentos).
        pct: daEquipe ? rotuloDoPct(resumo.pcts, pro.ativa ? pro.commissionPct : null) : null,
        linhas: extrato.linhas.map((l) => ({
          id: l.appointmentId,
          dataLabel: formatWithPattern(l.startAt, "dd/MM", tz),
          clientName: l.clientName,
          serviceName: l.serviceName,
          recebidoCents: l.recebidoCents,
          comissaoCents: l.comissaoCents,
          faltaCents: l.faltaCents,
        })),
        aguardando: extrato.aguardando,
        indicadores: itensDosIndicadores(indicadores, {
          quem: daEquipe ? "ela" : "voce",
          recorte: "mês",
          encerrado: janela.fim <= agora,
        }),
      }}
    />
  );
}
