"use client";

/**
 * Fluxo público de agendamento em etapas:
 * 1. serviço → 2. com quem (só se 2+ profissionais atendem pelo link) →
 * 3. dia + horário → 4. dados da cliente → sucesso.
 * Sem login: as actions resolvem o estúdio pelo slug e revalidam tudo.
 */
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/money";
import { isValidPhone, waLink } from "@/lib/phone";
import { SERVICE_CATEGORIES, type ServiceCategory } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { IconCheck, IconChevronRight, IconUsers, IconWhatsApp } from "@/components/ui/icons";
import { IconLock } from "./icons";
import { criarSolicitacao, horariosPublicos } from "@/app/agendar/[slug]/actions";
import {
  PRIMEIRA_DISPONIVEL,
  type AgendarDia,
  type AgendarEstudio,
  type AgendarProfissional,
  type AgendarServico,
  type SolicitacaoSucesso,
  type TokenFormulario,
} from "./types";
import { SuccessScreen } from "./success-screen";

type Erro = { mensagem: string; codigo: "HORARIO" | "LIMITE" | "DADOS" | "PROFISSIONAL" };
type Etapa = "servico" | "profissional" | "horario" | "dados";

export function BookingFlow({
  estudio,
  servicos,
  dias,
  token,
  profissionais,
  proInicial = null,
}: {
  estudio: AgendarEstudio;
  servicos: AgendarServico[];
  dias: AgendarDia[];
  token: TokenFormulario;
  /** Quem atende pelo link. Com 2+, a cliente escolhe (ou "primeira disponível"). */
  profissionais: AgendarProfissional[];
  /** ?com= do link: profissional já escolhida (pula o passo). */
  proInicial?: string | null;
}) {
  const temPasso = profissionais.length > 1;
  const [etapa, setEtapa] = useState<Etapa>("servico");
  const [servico, setServico] = useState<AgendarServico | null>(null);
  /** Chave da profissional, PRIMEIRA_DISPONIVEL, ou nulo enquanto ela não escolheu. */
  const [proEscolhida, setProEscolhida] = useState<string | null>(proInicial);
  const [dia, setDia] = useState<string | null>(null);
  const [hora, setHora] = useState("");
  const [slots, setSlots] = useState<string[] | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [erro, setErro] = useState<Erro | null>(null);
  const [sucesso, setSucesso] = useState<SolicitacaoSucesso | null>(null);
  /** Profissionais que o servidor disse que saíram do link enquanto a página estava aberta. */
  const [foraDoLink, setForaDoLink] = useState<string[]>([]);
  const [enviando, startEnvio] = useTransition();
  const siteRef = useRef<HTMLInputElement>(null);

  /** O que vai para o servidor: sem passo, o servidor usa quem atende pelo link. */
  const escolhaPro = temPasso ? (proEscolhida ?? PRIMEIRA_DISPONIVEL) : undefined;
  const pro = temPasso ? (profissionais.find((p) => p.key === proEscolhida) ?? null) : null;

  // Horários livres do dia escolhido (com a antecedência mínima do estúdio),
  // na agenda da profissional escolhida — ou de todas, na primeira disponível.
  const servicoId = servico?.id ?? null;
  useEffect(() => {
    if (etapa !== "horario" || !servicoId || !dia) return;
    void recarga; // dependência proposital: refaz a busca após conflito de horário
    let ativo = true;
    setSlots(null);
    horariosPublicos({ slug: estudio.slug, dia, servicoId, profissional: escolhaPro })
      .then((r) => ativo && setSlots(r.slots))
      .catch(() => ativo && setSlots([]));
    return () => {
      ativo = false;
    };
  }, [etapa, dia, servicoId, escolhaPro, estudio.slug, recarga]);

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

  const passos: Array<{ etapa: Etapa; rotulo: string }> = temPasso
    ? [
        { etapa: "servico", rotulo: "Serviço" },
        { etapa: "profissional", rotulo: "Com quem" },
        { etapa: "horario", rotulo: "Horário" },
        { etapa: "dados", rotulo: "Seus dados" },
      ]
    : [
        { etapa: "servico", rotulo: "Serviço" },
        { etapa: "horario", rotulo: "Horário" },
        { etapa: "dados", rotulo: "Seus dados" },
      ];
  const passoAtual = passos.findIndex((p) => p.etapa === etapa);
  const passouDe = (e: Etapa) => passoAtual > passos.findIndex((p) => p.etapa === e);

  function escolherServico(s: AgendarServico) {
    setServico(s);
    setHora("");
    setErro(null);
    if (!dia && dias.length > 0) setDia(dias[0].dia);
    setEtapa(temPasso && proEscolhida === null ? "profissional" : "horario");
  }

  function escolherProfissional(key: string) {
    setProEscolhida(key);
    setHora("");
    setErro(null);
    if (!dia && dias.length > 0) setDia(dias[0].dia);
    setEtapa("horario");
  }

  function escolherHorario(h: string) {
    setHora(h);
    setErro(null);
    setEtapa("dados");
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
        profissional: escolhaPro,
        site: siteRef.current?.value ?? "",
        ts: token.ts,
        assinatura: token.assinatura,
      });
      if (!res.ok) {
        setErro({ mensagem: res.erro, codigo: res.codigo });
        if (res.codigo === "HORARIO") {
          // O horário foi ocupado enquanto ela preenchia — volta e recarrega.
          setHora("");
          setEtapa("horario");
          setRecarga((r) => r + 1);
        } else if (res.codigo === "PROFISSIONAL") {
          // Quem ela escolheu saiu do link — escolhe de novo.
          if (escolhaPro) setForaDoLink((lista) => [...lista, escolhaPro]);
          setProEscolhida(null);
          setHora("");
          setEtapa(temPasso ? "profissional" : "horario");
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

  // Ninguém atende pelo link no momento (a dona desligou o agendamento online de todas).
  if (profissionais.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface px-4 py-8 text-center">
        <p className="text-[15px] font-semibold text-ink">Agendamento online pausado</p>
        <p className="mx-auto mt-1 max-w-xs text-sm text-ink-soft">
          No momento o estúdio está marcando os horários pelo WhatsApp.
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
    );
  }

  const bannerErro =
    erro && (etapa !== "dados" || erro.codigo !== "DADOS") ? erro : null;
  const rotuloPro = pro ? pro.nome : "Primeira disponível";

  return (
    <div>
      <Stepper passos={passos.map((p) => p.rotulo)} atual={passoAtual} />

      {/* Resumo das escolhas já feitas */}
      {servico && etapa !== "servico" ? (
        <div className="mb-4 space-y-2.5">
          <ResumoEscolha
            rotulo="Serviço"
            valor={servico.nome}
            detalhe={`${servico.duracaoMin} min · ${formatBRL(servico.precoCents)}`}
            onTrocar={() => {
              setServico(null);
              setHora("");
              setErro(null);
              setEtapa("servico");
            }}
          />
          {temPasso && passouDe("profissional") ? (
            <ResumoEscolha
              rotulo="Com quem"
              valor={rotuloPro}
              icone={pro ? <AvatarProfissional pro={pro} size={28} /> : null}
              onTrocar={() => {
                setHora("");
                setErro(null);
                setEtapa("profissional");
              }}
            />
          ) : null}
          {etapa === "dados" && diaEscolhido && hora ? (
            <ResumoEscolha
              rotulo="Horário"
              valor={`${diaEscolhido.rotulo} ${diaEscolhido.dataCurta} às ${hora}`}
              onTrocar={() => {
                setHora("");
                setErro(null);
                setEtapa("horario");
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
      {etapa === "servico" ? (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold tracking-[-0.03em] text-ink">
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

      {/* Etapa 2 — com quem (só com 2+ profissionais no link) */}
      {etapa === "profissional" && servico && temPasso ? (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold tracking-[-0.03em] text-ink">
            Com quem você quer agendar?
          </h2>
          <ul className="divide-y divide-line/70 overflow-hidden rounded-2xl border border-line bg-surface">
            <li>
              <OpcaoProfissional
                marcada={(proEscolhida ?? PRIMEIRA_DISPONIVEL) === PRIMEIRA_DISPONIVEL}
                onClick={() => escolherProfissional(PRIMEIRA_DISPONIVEL)}
                icone={
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
                    <IconUsers width={19} height={19} />
                  </span>
                }
                titulo="Primeira disponível"
                detalhe="Mostra todos os horários livres do estúdio"
              />
            </li>
            {profissionais
              .filter((p) => !foraDoLink.includes(p.key))
              .map((p) => (
              <li key={p.key}>
                <OpcaoProfissional
                  marcada={proEscolhida === p.key}
                  onClick={() => escolherProfissional(p.key)}
                  icone={<AvatarProfissional pro={p} size={40} />}
                  titulo={p.nome}
                  detalhe="Só os horários livres dela"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Etapa 3 — dia + horário */}
      {etapa === "horario" && servico ? (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold tracking-[-0.03em] text-ink">
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
                    {pro ? `Horários livres de ${pro.nome}` : "Horários livres"}
                  </p>
                  {slots === null ? (
                    <p className="py-2 text-sm text-ink-faint">Buscando horários...</p>
                  ) : slots.length === 0 ? (
                    <p className="py-2 text-sm text-ink-faint">
                      {pro
                        ? `Nenhum horário livre com ${pro.nome} nesse dia — escolha outro dia ou outra profissional.`
                        : "Nenhum horário livre nesse dia — escolha outro dia."}
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

      {/* Etapa 4 — dados da cliente */}
      {etapa === "dados" && servico && dia && hora ? (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold tracking-[-0.03em] text-ink">Seus dados</h2>

          <form id="ag-form" onSubmit={enviar} className="space-y-4">
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

            <p className="flex items-center justify-center gap-1.5 text-xs text-ink-faint">
              <IconLock width={13} height={13} className="shrink-0" />
              Seus dados serão usados só para este agendamento.
            </p>
          </form>
        </section>
      ) : null}

      {/* Barra fixa (estilo iFood): resumo sempre à vista + CTA contextual */}
      {servico ? (
        <div className="fixed inset-x-0 bottom-0 z-40">
          <div className="mx-auto w-full max-w-lg px-4 pb-[max(12px,env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface/95 p-3 shadow-[var(--shadow-pop)] backdrop-blur-xl">
              <div className="min-w-0 grow">
                <p className="truncate text-[13px] font-semibold text-ink">
                  {servico.nome}
                </p>
                <p className="truncate text-xs text-ink-soft">
                  {etapa === "dados" && diaEscolhido && hora
                    ? [
                        `${diaEscolhido.rotulo} ${diaEscolhido.dataCurta} às ${hora}`,
                        pro ? `com ${pro.nome}` : null,
                        formatBRL(servico.precoCents),
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : `${servico.duracaoMin} min · ${formatBRL(servico.precoCents)}`}
                </p>
              </div>
              {etapa === "profissional" || etapa === "horario" ? (
                <span className="shrink-0 rounded-full bg-surface-sunken px-3.5 py-2 text-[13px] font-medium text-ink-faint">
                  {etapa === "profissional" ? "Escolha com quem" : "Escolha um horário"}
                </span>
              ) : etapa === "dados" ? (
                <Button
                  size="md"
                  type="submit"
                  form="ag-form"
                  disabled={enviando}
                  className="shrink-0 w-auto px-5"
                >
                  {enviando ? "Enviando..." : "Confirmar"}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stepper({ passos, atual }: { passos: string[]; atual: number }) {
  return (
    <ol className="mb-6 flex items-center gap-2">
      {passos.map((rotulo, i) => {
        const feito = atual > i;
        const ehAtual = atual === i;
        return (
          <li
            key={rotulo}
            aria-current={ehAtual ? "step" : undefined}
            className={cn("flex min-w-0 items-center gap-2", i < passos.length - 1 && "flex-1")}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                  feito || ehAtual
                    ? "bg-accent text-accent-ink"
                    : "bg-surface-sunken text-ink-faint",
                )}
              >
                {feito ? <IconCheck width={12} height={12} /> : i + 1}
              </span>
              {/* No celular só a etapa atual leva o nome (4 nomes não cabem). */}
              <span
                className={cn(
                  "text-xs font-medium",
                  ehAtual ? "shrink-0 whitespace-nowrap text-ink" : "sr-only text-ink-faint sm:not-sr-only sm:truncate",
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

/** Iniciais da profissional num círculo da cor dela. */
function AvatarProfissional({ pro, size }: { pro: AgendarProfissional; size: number }) {
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full font-bold leading-none tracking-[-0.02em] text-white"
      style={{ width: size, height: size, background: pro.cor, fontSize: Math.round(size * 0.38) }}
    >
      {pro.iniciais}
    </span>
  );
}

function OpcaoProfissional({
  marcada,
  onClick,
  icone,
  titulo,
  detalhe,
}: {
  marcada: boolean;
  onClick: () => void;
  icone: ReactNode;
  titulo: string;
  detalhe: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={marcada}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-sunken/60 active:bg-surface-sunken/60"
    >
      {icone}
      <span className="min-w-0 grow">
        <span className="block truncate text-[15px] font-medium text-ink">{titulo}</span>
        <span className="mt-0.5 block truncate text-xs text-ink-soft">{detalhe}</span>
      </span>
      {marcada ? (
        <IconCheck width={18} height={18} className="shrink-0 text-accent-strong" />
      ) : (
        <IconChevronRight width={18} height={18} className="shrink-0 text-ink-faint" />
      )}
    </button>
  );
}

function ResumoEscolha({
  rotulo,
  valor,
  detalhe,
  icone,
  onTrocar,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  icone?: ReactNode;
  onTrocar: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-sunken/60 px-3.5 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        {icone}
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
