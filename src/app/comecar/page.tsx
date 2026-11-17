/**
 * Cadastro pela própria cliente: ?v=CODIGO (vendedora) e ?plano=solo|empresa
 * vêm do link de divulgação. Pública (liberada no proxy).
 * No computador: painel roxo da marca à esquerda, formulário à direita.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { IconCheck } from "@/components/ui/icons";
import { TRIAL_DIAS, codigoSemCartao, normalizeSellerCode, promoAtiva, type PlanKey } from "@/lib/domain/plans";
import { ComecarForm } from "./comecar-form";
import { LashLogo, LashMark } from "@/components/brand/logo";
import { acharIndicadora } from "@/lib/domain/referral";

export const metadata: Metadata = { title: "Criar conta" };

const INCLUI = [
  "Agenda online com sinal por Pix",
  "Confirmações e lembretes saindo do seu WhatsApp",
  "Clientes, ficha técnica e anamnese",
  "Financeiro, metas e relatórios",
];

const PASSOS = [
  { n: "1", t: "Crie sua conta", s: "Leva 2 minutos." },
  { n: "2", t: "Salve o cartão no Mercado Pago", s: "Nenhuma cobrança agora." },
  { n: "3", t: `Use ${TRIAL_DIAS} dias com tudo liberado`, s: "Cancele quando quiser, direto no app." },
];

/** Link de prospecção (vendedora liberada): sem cartão no cadastro. */
const PASSOS_SEM_CARTAO = [
  { n: "1", t: "Crie sua conta", s: "Leva 2 minutos. Sem cartão." },
  { n: "2", t: `Use ${TRIAL_DIAS} dias com tudo liberado`, s: "Com as suas clientes de verdade." },
  { n: "3", t: "Gostou? Assine no fim do teste", s: "Só aí você coloca o cartão." },
];

function primeiro(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function ComecarPage(props: PageProps<"/comecar">) {
  const sp = await props.searchParams;
  const planoParam = (primeiro(sp.plano) ?? "").toLowerCase();
  const planoInicial: PlanKey = planoParam === "empresa" ? "EMPRESA" : "SOLO";
  const codigoInicial = normalizeSellerCode(primeiro(sp.v)) ?? "";
  const indicadora = await acharIndicadora(codigoInicial || null);
  const semCartao = !indicadora && codigoSemCartao(codigoInicial);
  const passos = semCartao ? PASSOS_SEM_CARTAO : PASSOS;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
      {/* Painel da marca (computador) */}
      <aside className="relative hidden overflow-hidden bg-[#1d1729] text-white lg:block">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(800px_600px_at_15%_0%,#4a3d6e_0%,transparent_60%),radial-gradient(600px_500px_at_100%_100%,#33284d_0%,transparent_60%)]"
        />
        <div className="relative flex min-h-dvh flex-col justify-between p-12 lg:sticky lg:top-0 xl:p-16">
          <Link href="/" aria-label="LashOS, página inicial" className="w-fit">
            <LashLogo grande />
          </Link>

          <div className="py-12">
            <h1 className="max-w-md text-[44px] font-extrabold leading-[1.02] tracking-[-0.045em] xl:text-[52px]">
              Comece hoje. <span className="text-[#cfc6ea]">{semCartao ? "Sem cartão para testar." : "Pague só depois do teste."}</span>
            </h1>
            <ol className="mt-10 max-w-sm space-y-5">
              {passos.map((p) => (
                <li key={p.n} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-[14px] font-bold text-[#cfc6ea] ring-1 ring-white/15">
                    {p.n}
                  </span>
                  <span>
                    <span className="block text-[16px] font-semibold">{p.t}</span>
                    <span className="block text-[14px] text-white/60">{p.s}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="max-w-md border-t border-white/10 pt-6">
            <p className="text-[12.5px] font-bold uppercase tracking-[0.14em] text-[#cfc6ea]">Tudo incluído</p>
            <ul className="mt-3 grid gap-2 text-[14px] text-white/75">
              {INCLUI.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <IconCheck width={16} height={16} className="mt-0.5 shrink-0 text-[#cfc6ea]" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[12.5px] text-white/45">Pagamento seguro pelo Mercado Pago · Seus dados protegidos (LGPD)</p>
          </div>
        </div>
      </aside>

      {/* Formulário */}
      <main className="px-5 py-8 sm:px-8 sm:py-12 lg:flex lg:items-center lg:px-12 xl:px-20">
        <div className="mx-auto w-full max-w-md lg:max-w-[560px]">
          {/* Topo no celular */}
          <div className="mb-8 text-center lg:hidden">
            <Link
              href="/"
              aria-label="LashOS, página inicial"
              className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#1d1729] bg-[radial-gradient(60px_50px_at_30%_20%,#4a3d6e,transparent_70%)]"
            >
              <LashMark className="h-8 w-8" strokeWidth={2} />
            </Link>
            <h1 className="text-[30px] font-bold leading-[1.1] tracking-[-0.035em] text-ink text-balance">
              Seu estúdio inteiro, num app só
            </h1>
            <p className="mt-2 text-[15px] leading-snug text-ink-soft">
              {TRIAL_DIAS} dias grátis para testar com as suas clientes de verdade.
            </p>
          </div>

          {/* Título no computador */}
          <div className="mb-8 hidden lg:block">
            <h2 className="text-[32px] font-bold leading-[1.1] tracking-[-0.035em] text-ink">Crie sua conta</h2>
            <p className="mt-2 text-[15px] text-ink-soft">{TRIAL_DIAS} dias grátis para testar com as suas clientes de verdade.</p>
          </div>

          {indicadora ? (
            <p className="mb-4 rounded-[14px] bg-accent-soft px-4 py-3 text-[13.5px] leading-snug text-ink">
              Você veio pela indicação de <b className="font-semibold">{indicadora.studioName}</b>.
            </p>
          ) : null}

          <div className="rounded-[22px] bg-surface p-5 shadow-[var(--shadow-card)] ring-1 ring-[rgb(23_21_30/0.04)] sm:p-7 lg:p-8">
            <ComecarForm planoInicial={planoInicial} codigoInicial={codigoInicial} promo={promoAtiva()} />
          </div>

          <p className="mt-6 text-center text-[14px] text-ink-soft">
            Já tem conta?{" "}
            <Link href="/login" className="font-semibold text-ink underline underline-offset-4">
              Entrar
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
