/**
 * Tela de assinatura: aparece quando o acesso está bloqueado (teste vencido,
 * mensalidade atrasada ou conta suspensa), pelo aviso do topo e via ?volta=1
 * do checkout. Fora do grupo (app) de propósito — sem o gate, sem shell.
 */
import Link from "next/link";
import { requireProfessional } from "@/lib/session";
import { acessoBloqueado, STATUS_ASSINATURA_LABEL } from "@/lib/domain/subscription";
import { formatBRL } from "@/lib/money";
import { diffLocalDays, formatDate } from "@/lib/dates";
import { sairDaConta } from "@/components/shell/sign-out-action";
import { IconCheck, IconChevronLeft } from "@/components/ui/icons";
import { AssinarForm } from "./assinar-form";

export const metadata = { title: "Assinatura" };

const INCLUI = [
  "Agenda com link de agendamento e sinal por Pix",
  "Clientes, ficha técnica e anamnese com alerta",
  "Fila de WhatsApp com as mensagens prontas",
  "Financeiro, estoque e relatórios",
  "Conquistas e resumo da semana para compartilhar",
];

const GARANTIAS = [
  "Cartão de crédito, renovação automática todo mês",
  "Sem fidelidade: cancele quando quiser",
  "Seus dados são seus: ficam guardados mesmo se a assinatura parar",
];

export default async function AssinaturaPage(props: PageProps<"/assinatura">) {
  const professional = await requireProfessional();
  const sp = await props.searchParams;
  const voltouDoCheckout = (Array.isArray(sp.volta) ? sp.volta[0] : sp.volta) === "1";
  const bloqueada = acessoBloqueado(professional);
  const tz = professional.timezone;
  const now = new Date();

  const emTeste =
    professional.subscriptionStatus === "TRIAL" &&
    professional.trialEndsAt !== null &&
    professional.trialEndsAt > now;
  const diasRestantes = emTeste ? Math.max(0, diffLocalDays(now, professional.trialEndsAt!, tz)) : 0;
  const diasTotais = emTeste
    ? Math.max(1, diffLocalDays(professional.createdAt, professional.trialEndsAt!, tz))
    : 1;
  const progresso = emTeste ? Math.min(100, Math.round(((diasTotais - diasRestantes) / diasTotais) * 100)) : 0;

  const cartaoAtivo =
    professional.subscriptionStatus === "ATIVA" && Boolean(professional.mpPreapprovalId) && !bloqueada;

  const titulo = bloqueada
    ? professional.subscriptionStatus === "TRIAL"
      ? "Seu teste grátis terminou"
      : professional.subscriptionStatus === "SUSPENSA"
        ? "Sua conta está suspensa"
        : "Sua assinatura venceu"
    : "Assinatura";

  const subtitulo = voltouDoCheckout
    ? bloqueada
      ? "Estamos confirmando seu pagamento com o Mercado Pago. Pode levar alguns instantes: atualize a página em seguida."
      : "Assinatura confirmada. Seu estúdio está liberado."
    : bloqueada
      ? "Seus dados estão guardados: clientes, agenda, fotos e financeiro voltam exatamente como estavam assim que a assinatura for ativada."
      : "Um plano só, com tudo do LashOS. Você vê o valor antes de confirmar.";

  return (
    <div className="min-h-dvh px-4 py-8 sm:px-6 sm:py-14">
      <div className="mx-auto w-full max-w-4xl">
        {!bloqueada ? (
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 rounded-full py-1.5 pr-3 text-[14px] font-semibold text-ink-soft hover:text-ink"
          >
            <IconChevronLeft width={17} height={17} />
            Voltar para o app
          </Link>
        ) : null}

        <h1 className="font-display text-[30px] font-bold leading-[1.1] tracking-[-0.035em] text-ink text-balance sm:text-[36px]">
          {titulo}
        </h1>
        <p className="mt-2 max-w-[60ch] text-[15px] leading-snug text-ink-soft">{subtitulo}</p>

        <div className="mt-8 grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-start">
          {/* Situação */}
          <section className="rounded-[22px] bg-surface p-6 shadow-[var(--shadow-card)] ring-1 ring-[rgb(23_21_30/0.04)]">
            {emTeste ? (
              <>
                <h2 className="text-[14px] font-semibold text-ink-soft">Seu teste grátis</h2>
                <p className="mt-2 flex items-baseline gap-2">
                  <span className="text-[52px] font-bold leading-none tracking-[-0.04em] text-ink tabular-nums">
                    {diasRestantes}
                  </span>
                  <span className="text-[15px] font-medium text-ink-soft">
                    {diasRestantes === 1 ? "dia restante" : "dias restantes"}
                  </span>
                </p>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(4, progresso)}%` }} />
                </div>
                <p className="mt-2.5 text-[13px] text-ink-soft">
                  Termina em {formatDate(professional.trialEndsAt!, tz)}. Nenhuma cobrança até lá.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-[14px] font-semibold text-ink-soft">Situação</h2>
                <p className="mt-2 text-[22px] font-bold tracking-[-0.03em] text-ink">
                  {STATUS_ASSINATURA_LABEL[professional.subscriptionStatus] ??
                    professional.subscriptionStatus}
                </p>
                <p className="mt-1 text-[13.5px] text-ink-soft">
                  {professional.subscriptionStatus === "CORTESIA"
                    ? "Acesso liberado, sem cobrança."
                    : professional.subscriptionPaidUntil
                      ? `${bloqueada ? "Venceu em" : "Válida até"} ${formatDate(professional.subscriptionPaidUntil, tz)}`
                      : "Sem pagamento registrado ainda."}
                  {professional.mpPreapprovalId && !bloqueada ? " · cartão recorrente ativo" : ""}
                </p>
              </>
            )}

            <ul className="mt-6 space-y-2.5 border-t border-line pt-5">
              {GARANTIAS.map((g) => (
                <li key={g} className="flex items-start gap-2.5 text-[13.5px] text-ink">
                  <IconCheck width={16} height={16} className="mt-0.5 shrink-0 text-success" />
                  {g}
                </li>
              ))}
            </ul>
          </section>

          {/* Plano */}
          <section className="rounded-[22px] bg-accent p-6 text-accent-ink shadow-[var(--shadow-pop)] sm:p-7">
            <h2 className="text-[20px] font-bold tracking-[-0.025em]">LashOS</h2>
            <p className="mt-0.5 text-[14px] text-white/70">Tudo para o seu estúdio, num app só</p>
            <p className="mt-5 flex items-baseline gap-1.5">
              <span className="text-[15px] font-medium text-white/70">R$</span>
              <span className="text-[44px] font-bold leading-none tracking-[-0.04em] tabular-nums">
                {formatBRL(professional.planPriceCents).replace(/^R\$\s?/, "")}
              </span>
              <span className="text-[15px] font-medium text-white/70">/mês</span>
            </p>
            <ul className="mt-6 space-y-2.5">
              {INCLUI.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[14px] text-white/90">
                  <IconCheck width={16} height={16} className="mt-0.5 shrink-0 text-white/70" />
                  {item}
                </li>
              ))}
            </ul>
            {cartaoAtivo ? (
              <p className="mt-7 rounded-[14px] bg-white/10 px-4 py-3 text-[13.5px] text-white/90">
                Seu cartão recorrente está ativo. Para trocar de cartão ou cancelar, fale com o suporte.
              </p>
            ) : professional.subscriptionStatus !== "CORTESIA" ? (
              <div className="mt-7">
                <AssinarForm emTeste={emTeste} />
              </div>
            ) : null}
          </section>
        </div>

        <form action={sairDaConta} className="mt-8 text-center">
          <button
            type="submit"
            className="rounded-full px-4 py-2 text-[13.5px] font-semibold text-ink-soft hover:bg-surface hover:text-ink"
          >
            Sair da conta
          </button>
        </form>
      </div>
    </div>
  );
}
