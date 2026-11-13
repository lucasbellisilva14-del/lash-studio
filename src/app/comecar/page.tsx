/**
 * Cadastro pela própria cliente: ?v=CODIGO (vendedora) e ?plano=solo|empresa
 * vêm do link de divulgação. Pública (liberada no proxy).
 */
import type { Metadata } from "next";
import Link from "next/link";
import { IconCheck } from "@/components/ui/icons";
import { TRIAL_DIAS, normalizeSellerCode, type PlanKey } from "@/lib/domain/plans";
import { ComecarForm } from "./comecar-form";
import { LashMark } from "@/components/brand/logo";

export const metadata: Metadata = { title: "Criar conta" };

const INCLUI = [
  "Agenda com link de agendamento e sinal por Pix",
  "Fila de WhatsApp com as mensagens prontas",
  "Clientes, ficha técnica e anamnese",
  "Financeiro, estoque e relatórios",
];

function primeiro(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function ComecarPage(props: PageProps<"/comecar">) {
  const sp = await props.searchParams;
  const planoParam = (primeiro(sp.plano) ?? "").toLowerCase();
  const planoInicial: PlanKey = planoParam === "empresa" ? "EMPRESA" : "SOLO";
  const codigoInicial = normalizeSellerCode(primeiro(sp.v)) ?? "";

  return (
    <div className="min-h-dvh px-5 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            aria-label="LashOS, página inicial"
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[18px] bg-[radial-gradient(60px_50px_at_30%_20%,#4a3d6e,transparent_70%),#1d1729]"
          >
            <LashMark className="h-8 w-8" strokeWidth={2} />
          </Link>
          <h1 className="text-[30px] font-bold leading-[1.1] tracking-[-0.035em] text-ink text-balance">
            Seu estúdio inteiro, num app só
          </h1>
          <p className="mt-2 text-[15px] leading-snug text-ink-soft">
            {TRIAL_DIAS} dias grátis para testar com as suas clientes de verdade.
          </p>
          <ul className="mx-auto mt-5 inline-grid gap-1.5 text-left">
            {INCLUI.map((item) => (
              <li key={item} className="flex items-start gap-2 text-[13.5px] text-ink">
                <IconCheck width={16} height={16} className="mt-0.5 shrink-0 text-success" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[22px] bg-surface p-5 shadow-[var(--shadow-card)] ring-1 ring-[rgb(23_21_30/0.04)] sm:p-7">
          <ComecarForm planoInicial={planoInicial} codigoInicial={codigoInicial} />
        </div>

        <p className="mt-6 text-center text-[14px] text-ink-soft">
          Já tem conta?{" "}
          <Link href="/login" className="font-semibold text-ink underline underline-offset-4">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
