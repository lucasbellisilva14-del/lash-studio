"use client";

/**
 * Fluxo público de agendamento em etapas:
 * 1. serviço → 2. dia + horário → 3. dados da cliente → sucesso.
 * Sem login: as actions resolvem o estúdio pelo slug e revalidam tudo.
 */
import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/money";
import { isValidPhone, waLink } from "@/lib/phone";
import { SERVICE_CATEGORIES, type ServiceCategory } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { IconCheck, IconWhatsApp } from "@/components/ui/icons";
import { IconLock } from "./icons";
import { criarSolicitacao, horariosPublicos } from "@/app/agendar/[slug]/actions";
import type {
  AgendarDia,
  AgendarEstudio,
  AgendarServico,
  SolicitacaoSucesso,
  TokenFormulario,
} from "./types";
import { SuccessScreen } from "./success-screen";

type Erro = { mensagem: string; codigo: "HORARIO" | "LIMITE" | "DADOS" };

export function BookingFlow({
  estudio,
  servicos,
  dias,
  token,
}: {
  estudio: AgendarEstudio;
  servicos: AgendarServico[];
  dias: AgendarDia[];
  token: TokenFormulario;
}) {
  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);
  const [servico, setServico] = useState<AgendarServico | null>(null);
  const [dia, setDia] = useState<string | null>(null);
  const [hora, setHora] = useState("");
  const [slots, setSlots] = useState<string[] | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [erro, setErro] = useState<Erro | null>(null);
  const [sucesso, setSucesso] = useState<SolicitacaoSucesso | null>(null);
  const [enviando, startEnvio] = useTransition();
  const siteRef = useRef<HTMLInputElement>(null);

  // Horários livres do dia escolhido (com a antecedência mínima do estúdio).
  const servicoId = servico?.id ?? null;
  useEffect(() => {
    if (etapa !== 2 || !servicoId || !dia) return;
    void recarga; // dependência proposital: refaz a busca após conflito de horário
    let ativo = true;
    setSlots(null);
    horariosPublicos({ slug: estudio.slug, dia, servicoId })
      .then((r) => ativo && setSlots(r.slots))
      .catch(() => ativo && setSlots([]));
    return () => {
      ativo = false;
    };
  }, [etapa, dia, servicoId, estudio.slug, recarga]);

  const gruposServicos = useMemo(() => {
    const grupos = new Map<ServiceCategory, AgendarServico[]>();
    for (const s of servicos) {
      const lista = grupos.get(s.categoria) ?? [];
      lista.push(s);
      grupos.set(s.categoria, lista);
    }
    return (Object.keys(SERVICE_CATEGORIES) as ServiceCategory[])
      .filter((cat) => grupos.has(cat))
      .map((cat) => ({ categoria: cat, itens: grupos.get(cat)! }));
  }, [servicos]);

  const diaEscolhido = useMemo(
    () => (dia ? dias.find((d) => d.dia === dia) ?? null : null),
    [dia, dias],
  );

  function escolherServico(s: AgendarServico) {
    setServico(s);
    setHora("");
    setErro(null);
    if (!dia && dias.length > 0) setDia(dias[0].dia);
    setEtapa(2);
  }

  function escolherHorario(h: string) {
    setHora(h);
    setErro(null);
    setEtapa(3);
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!servico || !dia || !hora) return;
    setErro(null);
    if (nome.trim().length < 2) {
      setErro({ mensagem: "Informe seu nome completo.", codigo: "DADOS" });
      return;
    }
    if (!isValidPhone(whatsapp)) {
      setErro({
        mensagem: "WhatsApp inválido — use DDD + número (ex.: 48 99999-8888).",
        codigo: "DADOS",
      });
      return;
    }
    startEnvio(async () => {
      const res = await criarSolicitacao({
        slug: estudio.slug,
        servicoId: servico.id,
        dia,
        hora,
        nome: nome.trim(),
        whatsapp,
        site: siteRef.current?.value ?? "",
        ts: token.ts,
        assinatura: token.assinatura,
      });
      if (!res.ok) {
        setErro({ mensagem: res.erro, codigo: res.codigo });
        if (res.codigo === "HORARIO") {
          // O horário foi ocupado enquanto ela preenchia — volta e recarrega.
          setHora("");
          setEtapa(2);
          setRecarga((r) => r + 1);
        }
        return;
      }
      setSucesso(res.sucesso);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  if (sucesso) {
    return <SuccessScreen sucesso={sucesso} whatsapp={estudio.whatsapp} />;
  }

  const bannerErro =
    erro && (etapa !== 3 || erro.codigo !== "DADOS") ? erro : null;

  return (
    <div>
      <Stepper etapa={etapa} />

      {/* Resumo das escolhas já feitas */}
      {servico && etapa > 1 ? (
        <div className="mb-4 space-y-2.5">
          <ResumoEscolha
            rotulo="Serviço"
            valor={servico.nome}
            detalhe={`${servico.duracaoMin} min · ${formatBRL(servico.precoCents)}`}
            onTrocar={() => {
              setServico(null);
              setHora("");
              setErro(null);
              setEtapa(1);
            }}
          />
          {etapa === 3 && diaEscolhido && hora ? (
            <ResumoEscolha
              rotulo="Horário"
              valor={`${diaEscolhido.rotulo} ${diaEscolhido.dataCurta} às ${hora}`}
              onTrocar={() => {
                setHora("");
                setErro(null);
                setEtapa(2);
              }}
            />
          ) : null}
        </div>
      ) : null}

      {bannerErro ? (
        <div className="mb-4 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          <p>{bannerErro.mensagem}</p>
          {bannerErro.codigo === "LIMITE" && estudio.whatsapp ? (
            <a
              href={waLink(
                estudio.whatsapp,
                "Oi! Tentei agendar pelo link e a agenda online estava cheia. Consegue me encaixar?",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 font-medium underline underline-offset-2"
            >
              <IconWhatsApp width={15} height={15} />
              Chamar no WhatsApp
            </a>
          ) : null}
        </div>
      ) : null}

      {/* Etapa 1 — serviço */}
      {etapa === 1 ? (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold text-ink">
            Escolha o serviço
          </h2>
          {gruposServicos.length === 0 ? (
            <div className="rounded-2xl border border-line bg-surface px-4 py-8 text-center">
              <p className="text-sm text-ink-soft">
                O estúdio ainda não publicou os serviços por aqui.
              </p>
              {estudio.whatsapp ? (
                <a
                  href={waLink(estudio.whatsapp, "Oi! Quero agendar um horário.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent-strong"
                >
                  <IconWhatsApp width={16} height={16} />
                  Agendar pelo WhatsApp
                </a>
              ) : null}
            </div>
          ) : (
            gruposServicos.map(({ categoria, itens }) => (
              <div key={categoria}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  {SERVICE_CATEGORIES[categoria]}
                </p>
                <ul className="divide-y divide-line/70 overflow-hidden rounded-2xl border border-line bg-surface">
                  {itens.map((s) => (
                    <li key={s.id}>
                      <button
                        onClick={() => escolherServico(s)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-sunken/60 active:bg-surface-sunken/60"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[15px] font-medium text-ink">
                            {s.nome}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-soft">
                            {s.duracaoMin} min
                            {s.exigeSinal ? (
                              <Badge tone="accent">Exige sinal</Badge>
                            ) : null}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-medium text-ink">
                          {formatBRL(s.precoCents)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>
      ) : null}

      {/* Etapa 2 — dia + horário */}
      {etapa === 2 && servico ? (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold text-ink">
            Escolha o dia e o horário
          </h2>

          {dias.length === 0 ? (
            <div className="rounded-2xl border border-line bg-surface px-4 py-8 text-center">
              <p className="text-sm text-ink-soft">
                A agenda online está sem dias disponíveis no momento.
              </p>
              {estudio.whatsapp ? (
                <a
                  href={waLink(estudio.whatsapp, "Oi! Quero agendar um horário.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent-strong"
                >
                  <IconWhatsApp width={16} height={16} />
                  Combinar pelo WhatsApp
                </a>
              ) : null}
            </div>
          ) : (
            <>
              <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                {dias.map((d) => {
                  const ativo = d.dia === dia;
                  return (
                    <button
                      key={d.dia}
                      onClick={() => {
                        setDia(d.dia);
                        setHora("");
                        setErro(null);
                      }}
                      className={cn(
                        "flex min-w-[76px] shrink-0 flex-col items-center rounded-2xl border px-3 py-2.5 transition-colors",
                        ativo
                          ? "border-accent bg-accent text-accent-ink shadow-sm"
                          : "border-line bg-surface text-ink-soft hover:bg-surface-sunken",
                      )}
                    >
                      <span className="text-[11px] font-medium lowercase">
                        {d.rotulo}
                      </span>
                      <span className="text-sm font-semibold tabular-nums">
                        {d.dataCurta}
                      </span>
                    </button>
                  );
                })}
              </div>

              {dia ? (
                <div>
                  <p className="mb-1.5 text-[13px] font-medium text-ink-soft">
                    Horários livres
                  </p>
                  {slots === null ? (
                    <p className="py-2 text-sm text-ink-faint">Buscando horários...</p>
                  ) : slots.length === 0 ? (
                    <p className="py-2 text-sm text-ink-faint">
                      Nenhum horário livre nesse dia — escolha outro dia.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {slots.map((s) => (
                        <button
                          key={s}
                          onClick={() => escolherHorario(s)}
                          className={cn(
                            "h-10 rounded-full border px-4 text-sm font-medium tabular-nums transition-colors",
                            hora === s
                              ? "border-accent bg-accent text-accent-ink"
                              : "border-line bg-surface text-ink-soft hover:bg-surface-sunken",
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-ink-faint">Escolha um dia para ver os horários.</p>
              )}

              {estudio.minAdvanceHours > 0 ? (
                <p className="text-xs text-ink-faint">
                  Agendamentos precisam de pelo menos {estudio.minAdvanceHours}h de
                  antecedência.
                </p>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {/* Etapa 3 — dados da cliente */}
      {etapa === 3 && servico && dia && hora ? (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold text-ink">Seus dados</h2>

          <form onSubmit={enviar} className="space-y-4">
            <Field label="Nome completo" htmlFor="ag-nome">
              <Input
                id="ag-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome e sobrenome"
                autoComplete="name"
                maxLength={80}
                autoFocus
              />
            </Field>
            <Field label="WhatsApp" htmlFor="ag-zap" hint="O estúdio confirma seu horário por ele.">
              <Input
                id="ag-zap"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="(48) 99999-8888"
                inputMode="tel"
                autoComplete="tel"
              />
            </Field>

            {/* Honeypot: escondido de gente, irresistível para robô. */}
            <div
              aria-hidden="true"
              className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden"
            >
              <label htmlFor="ag-site">Deixe este campo vazio</label>
              <input
                id="ag-site"
                ref={siteRef}
                name="site"
                type="text"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {servico.exigeSinal ? (
              <div className="rounded-xl bg-accent-soft px-3.5 py-3 text-sm text-accent-strong">
                Esse serviço exige sinal para garantir o horário — as instruções de
                pagamento aparecem depois de enviar a solicitação.
              </div>
            ) : null}

            {erro && erro.codigo === "DADOS" ? (
              <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
                {erro.mensagem}
              </p>
            ) : null}

            <Button size="lg" type="submit" disabled={enviando}>
              {enviando
                ? "Enviando..."
                : `Solicitar ${hora} · ${formatBRL(servico.precoCents)}`}
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-xs text-ink-faint">
              <IconLock width={13} height={13} className="shrink-0" />
              Seus dados serão usados só para este agendamento.
            </p>
          </form>
        </section>
      ) : null}
    </div>
  );
}

function Stepper({ etapa }: { etapa: 1 | 2 | 3 }) {
  const passos = ["Serviço", "Horário", "Seus dados"];
  return (
    <ol className="mb-6 flex items-center gap-2">
      {passos.map((rotulo, i) => {
        const n = i + 1;
        const feito = etapa > n;
        const atual = etapa === n;
        return (
          <li
            key={rotulo}
            className={cn("flex min-w-0 items-center gap-2", i < passos.length - 1 && "flex-1")}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                  feito || atual
                    ? "bg-accent text-accent-ink"
                    : "bg-surface-sunken text-ink-faint",
                )}
              >
                {feito ? <IconCheck width={12} height={12} /> : n}
              </span>
              <span
                className={cn(
                  "truncate text-xs font-medium",
                  atual ? "text-ink" : "text-ink-faint",
                )}
              >
                {rotulo}
              </span>
            </span>
            {i < passos.length - 1 ? (
              <span className="h-px min-w-3 flex-1 bg-line" aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function ResumoEscolha({
  rotulo,
  valor,
  detalhe,
  onTrocar,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  onTrocar: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-sunken/60 px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
          {rotulo}
        </p>
        <p className="truncate text-[15px] font-medium text-ink">
          {valor}
          {detalhe ? (
            <span className="text-sm font-normal text-ink-soft"> · {detalhe}</span>
          ) : null}
        </p>
      </div>
      <button
        onClick={onTrocar}
        className="shrink-0 text-sm font-medium text-accent-strong hover:underline"
      >
        Trocar
      </button>
    </div>
  );
}
