/**
 * Tela de assinatura: aparece quando o acesso está bloqueado (trial vencido,
 * mensalidade atrasada ou conta suspensa) e também via ?volta=1 do checkout.
 * Fora do grupo (app) de propósito — sem o gate, sem shell.
 */
import { requireProfessional } from "@/lib/session";
import { acessoBloqueado, STATUS_ASSINATURA_LABEL } from "@/lib/domain/subscription";
import { formatBRL } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { sairDaConta } from "@/components/shell/sign-out-action";
import Link from "next/link";
import { AssinarForm } from "./assinar-form";

export const metadata = { title: "Assinatura" };

export default async function AssinaturaPage(props: PageProps<"/assinatura">) {
  const professional = await requireProfessional();
  const sp = await props.searchParams;
  const voltouDoCheckout = (Array.isArray(sp.volta) ? sp.volta[0] : sp.volta) === "1";
  const bloqueada = acessoBloqueado(professional);

  const titulo = bloqueada
    ? professional.subscriptionStatus === "TRIAL"
      ? "Seu período de teste terminou 💗"
      : professional.subscriptionStatus === "SUSPENSA"
        ? "Sua conta está suspensa"
        : "Sua assinatura venceu"
    : "Assinatura do LashOS";

  return (
    <div
      className="accent-scope app-bg min-h-dvh flex flex-col items-center justify-center px-6 py-10"
      style={{
        ["--accent" as string]: professional.accentColor,
        ["--bg" as string]: professional.backgroundColor,
      }}
    >
      <div className="w-full max-w-sm">
        <div className="rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow-pop)] text-center">
          <p className="text-4xl mb-3" aria-hidden>
            {bloqueada ? "🔒" : "✨"}
          </p>
          <h1 className="font-display text-2xl font-semibold text-ink text-balance">
            {titulo}
          </h1>
          <p className="mt-2 text-sm text-ink-soft leading-relaxed">
            {voltouDoCheckout && !bloqueada
              ? "Assinatura confirmada! Seu estúdio está liberado."
              : voltouDoCheckout
                ? "Estamos confirmando seu pagamento com o Mercado Pago — pode levar alguns instantes. Atualize a página em seguida."
                : bloqueada
                  ? "Seus dados estão guardados com carinho: clientes, agenda, fotos e financeiro voltam exatamente como deixou assim que a assinatura for ativada."
                  : "Gerencie sua assinatura abaixo."}
          </p>

          <div className="mt-4 rounded-2xl bg-surface-sunken/70 px-4 py-3 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-soft">Plano mensal</span>
              <span className="font-semibold text-ink">
                {formatBRL(professional.planPriceCents)}/mês
              </span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-ink-soft">Situação</span>
              <span className="font-medium text-ink">
                {STATUS_ASSINATURA_LABEL[professional.subscriptionStatus] ??
                  professional.subscriptionStatus}
                {professional.subscriptionPaidUntil
                  ? ` · até ${formatDate(professional.subscriptionPaidUntil, professional.timezone)}`
                  : ""}
              </span>
            </div>
          </div>

          <div className="mt-5">
            <AssinarForm />
          </div>

          {!bloqueada ? (
            <Link
              href="/"
              className="mt-4 inline-block text-sm font-medium text-accent-strong hover:underline"
            >
              ← Voltar pro app
            </Link>
          ) : null}
        </div>

        <form action={sairDaConta} className="mt-4 text-center">
          <button
            type="submit"
            className="text-sm font-medium text-ink-faint hover:text-ink-soft"
          >
            Sair da conta
          </button>
        </form>
      </div>
    </div>
  );
}
