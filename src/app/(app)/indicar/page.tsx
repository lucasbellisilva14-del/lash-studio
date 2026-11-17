/**
 * Indique e ganhe (só a dona): o link de indicação do estúdio, quem entrou
 * por ele e os meses grátis já ganhos.
 */
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/session";
import { getAppOrigin } from "@/lib/domain/queue";
import { garantirCodigoIndicacao } from "@/lib/domain/referral";
import { formatDate } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { IndicarLink } from "./indicar-link";

export const metadata = { title: "Indique e ganhe" };

const TZ = "America/Sao_Paulo";

const PASSOS = [
  { n: "1", t: "Mande o seu link", s: "Para uma amiga lash que ainda não usa o LashOS." },
  { n: "2", t: "Ela testa 7 dias grátis", s: "Cria a conta pelo seu link e usa com as clientes dela." },
  { n: "3", t: "Você ganha 1 mês", s: "Quando ela paga a primeira mensalidade, a sua do mês sai de graça." },
];

export default async function IndicarPage() {
  const viewer = await requireOwner();
  const codigo = await garantirCodigoIndicacao(viewer.professionalId);
  // Sempre o domínio do site (nunca o endereço técnico por onde ela abriu o app).
  const origem = process.env.NODE_ENV === "production" ? "https://www.lashos.com.br" : await getAppOrigin();
  const link = `${origem}/i/${codigo}`;

  const indicadas = await prisma.professional.findMany({
    where: { referredById: viewer.professionalId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      studioName: true,
      createdAt: true,
      referralCreditFor: { select: { status: true } },
    },
  });
  const ganhos = indicadas.filter((i) => i.referralCreditFor).length;

  return (
    <div>
      <PageHeader
        title="Indique e ganhe"
        subtitle="Cada amiga lash que assinar pelo seu link vale 1 mês grátis para você."
        backHref="/mais"
      />

      <div className="space-y-4">
        <IndicarLink link={link} codigo={codigo} />

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardBody>
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">Amigas indicadas</p>
              <p className="mt-1 text-[28px] font-bold tracking-[-0.03em] text-ink tabular-nums">{indicadas.length}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">Meses grátis ganhos</p>
              <p className="mt-1 text-[28px] font-bold tracking-[-0.03em] text-ink tabular-nums">{ganhos}</p>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardBody>
            <p className="text-[15px] font-semibold text-ink">Como funciona</p>
            <ol className="mt-3 space-y-3.5">
              {PASSOS.map((p) => (
                <li key={p.n} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-[13px] font-bold text-ink">
                    {p.n}
                  </span>
                  <span>
                    <span className="block text-[14.5px] font-semibold text-ink">{p.t}</span>
                    <span className="block text-[13px] leading-snug text-ink-soft">{p.s}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-[12.5px] leading-relaxed text-ink-faint">
              O mês grátis vem como devolução da sua mensalidade seguinte, no mesmo cartão, em até 7
              dias depois da cobrança. Não tem limite de indicações: cada amiga que assinar vale um mês.
            </p>
          </CardBody>
        </Card>

        {indicadas.length > 0 ? (
          <Card>
            <CardBody>
              <p className="text-[15px] font-semibold text-ink">Suas indicações</p>
              <ul className="mt-2 divide-y divide-line">
                {indicadas.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 py-3">
                    <span className="min-w-0">
                      <span className="block truncate text-[14.5px] font-medium text-ink">{i.studioName}</span>
                      <span className="block text-[12.5px] text-ink-soft">Entrou em {formatDate(i.createdAt, TZ)}</span>
                    </span>
                    <span
                      className={
                        i.referralCreditFor
                          ? "shrink-0 rounded-full bg-success-soft px-2.5 py-1 text-[12px] font-semibold text-success"
                          : "shrink-0 rounded-full bg-surface-sunken px-2.5 py-1 text-[12px] font-semibold text-ink-soft"
                      }
                    >
                      {!i.referralCreditFor
                        ? "Testando"
                        : i.referralCreditFor.status === "APLICADO"
                          ? "Mês devolvido"
                          : "Você ganhou 1 mês"}
                    </span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
