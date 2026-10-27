/**
 * "Meus números" — o Financeiro da funcionária: só os atendimentos dela e a
 * comissão do mês. Sem abas, filtro, despesas, números do estúdio nem botões
 * de lançamento (e nenhum atalho para telas da dona). Toda consulta filtra
 * pelo estúdio E pelo memberId dela.
 */
import type { Professional } from "@prisma/client";
import { dayKeyToUtcStart, formatWithPattern, localDayKey } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import type { Viewer } from "@/lib/session";
import { getTeam } from "@/lib/team";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { IconPercent } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { ExtratoList } from "@/components/financeiro/extrato-list";
import { plural } from "@/components/financeiro/format";
import { PeriodBar } from "@/components/financeiro/period-bar";
import { StatGrid } from "@/components/financeiro/stat-grid";
import type { StatItem } from "@/components/financeiro/types";
import { buscarAgendamentosComNomes, buscarLancamentosComNomes } from "./data";
import { financeiroHref, primeiro } from "./links";
import { isMonthKey, monthKeyOf, monthLabel, monthRange, shiftMonthKey } from "./mes";
import { extratoDaProfissional, resumoProfissional } from "./numeros";

type SearchParams = Record<string, string | string[] | undefined>;

export async function PaginaFuncionaria({
  professional,
  viewer,
  sp,
  agora,
}: {
  professional: Professional;
  viewer: Viewer & { memberId: string };
  sp: SearchParams;
  agora: Date;
}) {
  const professionalId = professional.id;
  const memberId = viewer.memberId;
  const tz = professional.timezone;

  const mesAtual = monthKeyOf(agora, tz);
  const mesPedido = primeiro(sp.mes);
  const mes = isMonthKey(mesPedido) ? mesPedido : mesAtual;
  const { start, end } = monthRange(mes, tz);
  const mesLabel = monthLabel(mes, tz);
  const mesPassado = end <= agora;

  const team = await getTeam(professionalId);
  const pctHoje = team.find((p) => p.memberId === memberId)?.commissionPct ?? 0;

  const [txs, appts] = await Promise.all([
    buscarLancamentosComNomes({
      professionalId,
      type: "RECEITA",
      date: { gte: start, lt: end },
      appointment: { is: { memberId } },
    }),
    buscarAgendamentosComNomes({ professionalId, memberId, startAt: { gte: start, lt: end } }),
  ]);

  const inicioDeHoje = dayKeyToUtcStart(localDayKey(agora, tz), tz);
  const r = resumoProfissional(txs, appts, memberId, inicioDeHoje);
  const extrato = extratoDaProfissional(memberId, txs, appts);
  const data = (d: Date) => formatWithPattern(d, "dd/MM", tz);

  const stats: StatItem[] = [
    {
      key: "recebido",
      label: "Recebido",
      value: formatBRL(r.recebidoCents),
      hint: "Dos seus atendimentos, já sem as taxas",
    },
    {
      key: "comissao",
      label: "Sua comissão",
      value: formatBRL(r.comissaoCents),
      hint: `${pctHoje}% hoje, sobre o líquido de cada atendimento`,
      tone: r.comissaoCents > 0 ? "success" : "ink",
    },
    {
      key: "concluidos",
      label: "Atendimentos concluídos",
      value: String(r.concluidos),
      hint: "Marcados como concluídos no mês",
    },
    {
      key: "ticket",
      label: "Ticket médio",
      value: r.ticketMedioCents != null ? formatBRL(r.ticketMedioCents) : "—",
      hint: "Recebido por atendimento concluído",
    },
    {
      key: "areceber",
      label: "A receber",
      value: formatBRL(r.aReceberCents),
      hint: mesPassado ? "O mês já acabou: nada mais a entrar" : "Seus horários que ainda vão entrar",
    },
    {
      key: "atraso",
      label: "Em atraso",
      value: formatBRL(r.emAtrasoCents),
      hint: "Seus concluídos sem pagamento lançado",
      tone: r.emAtrasoCents > 0 ? "danger" : "ink",
    },
  ];

  const temAtendimentos = extrato.linhas.length > 0 || extrato.aguardando.length > 0;
  const href = (m: string) => financeiroHref({ mes: m }, mesAtual);

  return (
    <>
      <PageHeader title="Meus números" subtitle="Seus atendimentos e sua comissão no mês." />

      <div className="mb-5">
        <PeriodBar
          label={mesLabel}
          prevHref={href(shiftMonthKey(mes, -1))}
          nextHref={href(shiftMonthKey(mes, 1))}
          thisMonthHref={href(mesAtual)}
          isCurrent={mes === mesAtual}
        />
      </div>

      <div className="@container space-y-4">
        <StatGrid items={stats} />

        <Card className="overflow-hidden">
          <CardHeader
            title="Seus atendimentos"
            description="O que entrou de cada um no mês e a sua parte."
          />
          {temAtendimentos ? (
            <div className="px-4 py-1.5 sm:px-5">
              <ExtratoList
                linhas={extrato.linhas.map((l) => ({
                  id: l.appointmentId,
                  dateLabel: data(l.startAt),
                  clientName: l.clientName,
                  serviceName: l.serviceName,
                  recebidoCents: l.recebidoCents,
                  comissaoCents: l.comissaoCents,
                  faltaCents: l.faltaCents,
                  href: `/atendimentos/${l.appointmentId}`,
                }))}
                aguardando={extrato.aguardando.map((a) => ({
                  id: a.appointmentId,
                  dateLabel: data(a.startAt),
                  clientName: a.clientName,
                  serviceName: a.serviceName,
                  pendenteCents: a.pendenteCents,
                  href: `/atendimentos/${a.appointmentId}`,
                }))}
              />
            </div>
          ) : (
            <EmptyState
              icon={<IconPercent />}
              title="Nenhum atendimento pago neste mês"
              description="Quando o pagamento de um atendimento seu for lançado na ficha, ele aparece aqui com a sua comissão."
            />
          )}
          <div className="flex items-center justify-between gap-3 border-t border-line bg-surface-muted px-4 py-3.5 sm:px-5">
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold text-ink">Sua comissão no mês</p>
              <p className="text-[12px] tabular-nums text-ink-soft">
                {plural(extrato.linhas.length, "atendimento", "atendimentos")} · sobre{" "}
                {formatBRL(extrato.recebidoCents)}
              </p>
            </div>
            <p className="shrink-0 text-[18px] font-bold tracking-[-0.02em] tabular-nums text-ink">
              {formatBRL(extrato.comissaoCents)}
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}
