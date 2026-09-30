/**
 * Painel admin do LashOS (só e-mails da ADMIN_EMAILS): contas, assinaturas,
 * liberação/suspensão de acesso e criação de contas novas.
 */
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import {
  acessoBloqueado,
  STATUS_ASSINATURA_LABEL,
} from "@/lib/domain/subscription";
import { Card, CardBody } from "@/components/ui/card";
import { requireAdmin } from "./guard";
import { CriarContaForm } from "./criar-conta-form";
import {
  adicionarTrintaDiasAction,
  alternarSuspensaoAction,
  tornarCortesiaAction,
} from "./actions";

export const metadata = { title: "Admin · LashOS" };

const TZ = "America/Sao_Paulo";

export default async function AdminPage() {
  await requireAdmin();

  const contas = await prisma.professional.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      studioName: true,
      email: true,
      slug: true,
      subscriptionStatus: true,
      subscriptionPaidUntil: true,
      trialEndsAt: true,
      planPriceCents: true,
      mpPreapprovalId: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { clients: true, appointments: true } },
    },
  });
  const now = new Date();

  return (
    <div className="min-h-dvh bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header>
          <h1 className="font-display text-3xl font-semibold text-ink">
            Admin · LashOS
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            {contas.length} conta{contas.length === 1 ? "" : "s"} · assinaturas,
            acessos e criação
          </p>
        </header>

        <Card>
          <CardBody>
            <h2 className="font-display text-lg font-semibold text-ink mb-4">
              Nova conta
            </h2>
            <CriarContaForm />
          </CardBody>
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  <th className="px-4 py-3">Estúdio</th>
                  <th className="px-4 py-3">Assinatura</th>
                  <th className="px-4 py-3">Validade</th>
                  <th className="px-4 py-3">Preço</th>
                  <th className="px-4 py-3">Uso</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {contas.map((c) => {
                  const bloqueada = acessoBloqueado(
                    {
                      subscriptionStatus: c.subscriptionStatus,
                      subscriptionPaidUntil: c.subscriptionPaidUntil,
                      trialEndsAt: c.trialEndsAt,
                    },
                    now,
                  );
                  return (
                    <tr key={c.id} className={bloqueada ? "bg-danger-soft/40" : undefined}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{c.studioName}</p>
                        <p className="text-xs text-ink-soft">
                          {c.name} · {c.email}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-ink">
                          {STATUS_ASSINATURA_LABEL[c.subscriptionStatus] ?? c.subscriptionStatus}
                        </span>
                        {bloqueada ? (
                          <span className="block text-xs font-semibold text-danger">
                            acesso bloqueado
                          </span>
                        ) : null}
                        {c.mpPreapprovalId ? (
                          <span className="block text-[11px] text-ink-faint">
                            cartão recorrente 💳
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-ink-soft tabular-nums">
                        {c.subscriptionStatus === "TRIAL" && c.trialEndsAt
                          ? `teste até ${formatDate(c.trialEndsAt, TZ)}`
                          : c.subscriptionPaidUntil
                            ? formatDate(c.subscriptionPaidUntil, TZ)
                            : "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-ink tabular-nums">
                        {formatBRL(c.planPriceCents)}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-soft">
                        {c._count.clients} clientes
                        <br />
                        {c._count.appointments} atend.
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <form action={adicionarTrintaDiasAction}>
                            <input type="hidden" name="id" value={c.id} />
                            <button className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-surface-sunken">
                              +30 dias
                            </button>
                          </form>
                          <form action={tornarCortesiaAction}>
                            <input type="hidden" name="id" value={c.id} />
                            <button className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-surface-sunken">
                              Cortesia
                            </button>
                          </form>
                          <form action={alternarSuspensaoAction}>
                            <input type="hidden" name="id" value={c.id} />
                            <button
                              className={
                                c.subscriptionStatus === "SUSPENSA"
                                  ? "rounded-lg bg-success px-2.5 py-1.5 text-xs font-semibold text-white"
                                  : "rounded-lg bg-danger-soft px-2.5 py-1.5 text-xs font-semibold text-danger"
                              }
                            >
                              {c.subscriptionStatus === "SUSPENSA" ? "Reativar" : "Suspender"}
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <p className="text-center text-xs text-ink-faint">
          Assinatura no cartão: a cliente ativa sozinha na tela /assinatura ·
          renovação e bloqueio são automáticos via Mercado Pago.
        </p>
      </div>
    </div>
  );
}
