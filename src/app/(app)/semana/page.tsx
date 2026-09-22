import { requireProfessional } from "@/lib/session";
import { formatBRL } from "@/lib/money";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { getResumoSemana } from "./dados";
import { ShareSemana } from "./share-semana";

export const metadata = { title: "Sua semana" };

export default async function SemanaPage() {
  const professional = await requireProfessional();
  const resumo = await getResumoSemana(professional.id, professional.timezone);

  const semMovimento =
    resumo.atendimentos === 0 && resumo.faturamentoCents === 0 && resumo.novasClientes === 0;

  const textoShare =
    `Minha semana no ${professional.studioName} 💗\n` +
    `✨ ${resumo.atendimentos} atendimento${resumo.atendimentos === 1 ? "" : "s"}\n` +
    `💸 ${formatBRL(resumo.faturamentoCents)} de faturamento\n` +
    (resumo.novasClientes > 0
      ? `🤝 ${resumo.novasClientes} cliente${resumo.novasClientes === 1 ? " nova" : "s novas"}\n`
      : "") +
    `\nGestão com LashOS`;

  return (
    <div>
      <PageHeader
        title="Sua semana ✨"
        subtitle={`De ${resumo.periodo.de} a ${resumo.periodo.ate}`}
        backHref="/"
      />

      {semMovimento ? (
        <Card>
          <CardBody className="text-center py-10">
            <p className="text-3xl mb-2" aria-hidden>🌱</p>
            <p className="font-medium text-ink">Semana tranquila por aqui</p>
            <p className="text-sm text-ink-soft mt-1">
              Sem atendimentos nos últimos 7 dias. Que tal chamar as clientes da
              fila de mensagens?
            </p>
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="rounded-3xl bg-accent-gradient text-white p-6 shadow-[var(--shadow-pop)] celebrate">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/80">
              {professional.studioName}
            </p>
            <p className="font-display text-[44px] font-semibold leading-tight mt-1">
              {formatBRL(resumo.faturamentoCents)}
            </p>
            <p className="text-sm text-white/85">de faturamento na semana 💗</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <Card>
              <CardBody className="text-center py-5">
                <p className="font-display text-3xl font-semibold text-ink">
                  {resumo.atendimentos}
                </p>
                <p className="text-[13px] text-ink-soft mt-0.5">
                  atendimento{resumo.atendimentos === 1 ? "" : "s"} concluído
                  {resumo.atendimentos === 1 ? "" : "s"}
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center py-5">
                <p className="font-display text-3xl font-semibold text-ink">
                  {resumo.novasClientes}
                </p>
                <p className="text-[13px] text-ink-soft mt-0.5">
                  cliente{resumo.novasClientes === 1 ? " nova" : "s novas"}
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center py-5">
                <p className="font-display text-3xl font-semibold text-ink">{resumo.fotos}</p>
                <p className="text-[13px] text-ink-soft mt-0.5">
                  foto{resumo.fotos === 1 ? "" : "s"} de antes & depois
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center py-5">
                <p className="font-display text-2xl font-semibold text-ink capitalize leading-9">
                  {resumo.melhorDia ?? "—"}
                </p>
                <p className="text-[13px] text-ink-soft mt-0.5">seu melhor dia</p>
              </CardBody>
            </Card>
          </div>

          <ShareSemana texto={textoShare} />
        </>
      )}
    </div>
  );
}
