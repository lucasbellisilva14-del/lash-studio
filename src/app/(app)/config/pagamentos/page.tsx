import Link from "next/link";
import { requireProfessional } from "@/lib/session";
import { mpOauthDisponivel } from "@/lib/mp-oauth";
import { formatDate } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconCheck, IconMoney } from "@/components/ui/icons";
import { desconectarMpAction } from "./actions";

export const metadata = { title: "Pagamentos" };

export default async function PagamentosPage(props: PageProps<"/config/pagamentos">) {
  const professional = await requireProfessional();
  const sp = await props.searchParams;
  const ok = (Array.isArray(sp.ok) ? sp.ok[0] : sp.ok) === "1";
  const erro = Array.isArray(sp.erro) ? sp.erro[0] : sp.erro;
  const conectado = Boolean(professional.mpConnectedAt);

  return (
    <div>
      <PageHeader
        title="Pagamentos"
        subtitle="Sinal com confirmação automática via Pix"
        backHref="/config"
      />

      {ok ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-success-soft px-3.5 py-3 text-sm text-success">
          <IconCheck width={16} height={16} className="shrink-0" />
          Conta do Mercado Pago conectada! Os próximos sinais já caem na sua conta.
        </div>
      ) : null}
      {erro ? (
        <div className="mb-4 rounded-xl bg-danger-soft px-3.5 py-3 text-sm text-danger">
          {erro === "indisponivel"
            ? "A conexão com o Mercado Pago não está habilitada neste ambiente."
            : "Não foi possível conectar. Tente de novo — se persistir, fale com o suporte."}
        </div>
      ) : null}

      <Card>
        <CardBody>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent-strong shrink-0">
              <IconMoney width={20} height={20} />
            </span>
            <div className="min-w-0">
              <p className="font-medium text-[15px] text-ink">Mercado Pago</p>
              {conectado ? (
                <p className="text-sm text-ink-soft mt-0.5 leading-relaxed">
                  Conectado desde{" "}
                  {formatDate(professional.mpConnectedAt!, professional.timezone)}.
                  Quando a cliente paga o Pix do sinal, o horário{" "}
                  <b className="text-ink">confirma sozinho</b> e o dinheiro cai{" "}
                  <b className="text-ink">direto na sua conta</b>.
                </p>
              ) : (
                <p className="text-sm text-ink-soft mt-0.5 leading-relaxed">
                  Conecte sua conta (grátis) e os sinais passam a cair direto nela —
                  com o horário <b className="text-ink">confirmando sozinho</b> assim
                  que a cliente paga, sem você tocar em nada.
                </p>
              )}
            </div>
          </div>

          <div className="mt-4">
            {conectado ? (
              <form action={desconectarMpAction}>
                <Button type="submit" variant="danger-soft" className="w-full">
                  Desconectar minha conta
                </Button>
              </form>
            ) : (
              <a
                href="/api/mp/conectar"
                className="flex h-12 w-full items-center justify-center rounded-xl bg-[#009EE3] px-5 text-base font-medium text-white shadow-sm transition-opacity hover:opacity-90"
              >
                Conectar Mercado Pago
              </a>
            )}
          </div>

          {!conectado ? (
            <p className="mt-3 text-xs text-ink-faint leading-relaxed">
              Sem conta conectada, a cobrança do sinal usa sua chave Pix de{" "}
              <Link href="/config/perfil" className="font-medium text-accent-strong">
                Configurações → Perfil
              </Link>{" "}
              e a confirmação é manual (botão &quot;Sinal recebido&quot;).
            </p>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
