"use client";

/**
 * Fluxo de criação de agendamento em Sheet:
 * 1. cliente (busca ou cadastro rápido) → 2. serviço → 3. profissional (só a
 * dona com equipe), data/hora + confirmação. Os horários sugeridos são os da
 * agenda da profissional escolhida; a funcionária agenda sempre para ela.
 */
import { useEffect, useMemo, useState, useTransition } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { IconAlert, IconCheck, IconPlus, IconSearch } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/money";
import { formatPhone, isValidPhone } from "@/lib/phone";
import { dayKeyToUtcStart, formatDateShort, localToUtc } from "@/lib/dates";
import { SERVICE_CATEGORIES, type ServiceCategory } from "@/lib/constants";
import { computeDeposit } from "@/lib/domain/deposit";
import { OWNER_KEY } from "@/lib/team-shared";
import {
  criarAgendamento,
  criarClienteRapido,
  horariosLivres,
  verificarManutencao,
  type AvisoManutencao,
} from "@/app/(app)/agenda/actions";
import type { AgendaCliente, AgendaConfig, AgendaPro, AgendaServico } from "./types";
import { ContraindicacaoAlert } from "./contra-alert";
import { ProDot } from "./pro";

/** Soma dias a uma chave "yyyy-MM-dd" (meio-dia local evita pulo de fuso). */
export function somarDiasKey(dayKey: string, dias: number): string {
  const d = new Date(`${dayKey}T12:00:00`);
  d.setDate(d.getDate() + dias);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function NewAppointmentSheet({
  open,
  onClose,
  clientes,
  servicos,
  config,
  diaInicial,
  horaInicial = null,
  clienteInicialId,
  equipe = [],
  proInicialKey = OWNER_KEY,
  onCriado,
}: {
  open: boolean;
  onClose: () => void;
  clientes: AgendaCliente[];
  servicos: AgendaServico[];
  config: AgendaConfig;
  diaInicial: string;
  /** Pré-preenche o horário (toque num espaço vazio da timeline). */
  horaInicial?: string | null;
  clienteInicialId: string | null;
  /** Equipe ativa (só a dona recebe). O campo "Profissional" aparece com 2+. */
  equipe?: AgendaPro[];
  /** Profissional já escolhida ao abrir (a do filtro da agenda ou a dona). */
  proInicialKey?: string;
  onCriado: (resultado: { dia: string; aviso: string | null; proKey: string | null }) => void;
}) {
  const escolhePro = equipe.length > 1;
  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);
  const [cliente, setCliente] = useState<AgendaCliente | null>(null);
  const [servico, setServico] = useState<AgendaServico | null>(null);
  const [dia, setDia] = useState(diaInicial);
  const [hora, setHora] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [slots, setSlots] = useState<string[] | null>(null);
  const [manut, setManut] = useState<AvisoManutencao>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, startEnvio] = useTransition();
  const [proKey, setProKey] = useState(proInicialKey);
  /** O que vai para o servidor (só a dona com equipe escolhe). */
  const profissional = escolhePro ? proKey : undefined;
  const proEscolhida = escolhePro ? (equipe.find((p) => p.key === proKey) ?? null) : null;

  // Programar a manutenção do ciclo junto com a aplicação
  const [manutAtiva, setManutAtiva] = useState(false);
  const [diaManut, setDiaManut] = useState("");
  const [horaManut, setHoraManut] = useState("");
  const [slotsManut, setSlotsManut] = useState<string[] | null>(null);

  // Busca / cadastro rápido
  const [busca, setBusca] = useState("");
  const [extraClientes, setExtraClientes] = useState<AgendaCliente[]>([]);
  const [cadastroAberto, setCadastroAberto] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoZap, setNovoZap] = useState("");
  const [erroCadastro, setErroCadastro] = useState<string | null>(null);
  const [avisoCliente, setAvisoCliente] = useState<string | null>(null);
  const [salvandoCliente, startCadastro] = useTransition();

  // Reset ao abrir
  useEffect(() => {
    if (!open) return;
    const inicial = clienteInicialId
      ? clientes.find((c) => c.id === clienteInicialId) ?? null
      : null;
    setCliente(inicial);
    setEtapa(inicial ? 2 : 1);
    setServico(null);
    setProKey(equipe.some((p) => p.key === proInicialKey) ? proInicialKey : OWNER_KEY);
    setDia(diaInicial);
    setHora(horaInicial ?? "");
    setObservacoes("");
    setSlots(null);
    setManut(null);
    setErro(null);
    setManutAtiva(false);
    setDiaManut("");
    setHoraManut("");
    setSlotsManut(null);
    setBusca("");
    setCadastroAberto(false);
    setNovoNome("");
    setNovoZap("");
    setErroCadastro(null);
    setAvisoCliente(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Horários livres do dia escolhido, na agenda da profissional escolhida
  const servicoId = servico?.id ?? null;
  useEffect(() => {
    if (!open || etapa !== 3 || !servicoId || !dia) return;
    let ativo = true;
    setSlots(null);
    horariosLivres({ dia, servicoId, profissional })
      .then((r) => ativo && setSlots(r.slots))
      .catch(() => ativo && setSlots([]));
    return () => {
      ativo = false;
    };
  }, [open, etapa, dia, servicoId, profissional]);

  // Regra de ouro: manutenção dentro do prazo?
  const categoriaServico = servico?.categoria ?? null;
  const clienteId = cliente?.id ?? null;
  useEffect(() => {
    if (!open || etapa !== 3 || !servicoId || !clienteId || categoriaServico !== "MANUTENCAO") {
      setManut(null);
      return;
    }
    let ativo = true;
    verificarManutencao({ clienteId, servicoId, dia })
      .then((r) => ativo && setManut(r))
      .catch(() => ativo && setManut(null));
    return () => {
      ativo = false;
    };
  }, [open, etapa, dia, servicoId, clienteId, categoriaServico]);

  // Serviço de manutenção vinculado à aplicação escolhida (se houver)
  const manutServico = useMemo(
    () =>
      servico?.categoria === "APLICACAO"
        ? servicos.find((s) => s.manutencaoDeId === servico.id) ?? null
        : null,
    [servico, servicos],
  );

  // Horários livres para a manutenção programada (mesma profissional da aplicação)
  const manutServicoId = manutServico?.id ?? null;
  useEffect(() => {
    if (!open || !manutAtiva || !manutServicoId || !diaManut) return;
    let ativo = true;
    setSlotsManut(null);
    horariosLivres({ dia: diaManut, servicoId: manutServicoId, profissional })
      .then((r) => ativo && setSlotsManut(r.slots))
      .catch(() => ativo && setSlotsManut([]));
    return () => {
      ativo = false;
    };
  }, [open, manutAtiva, diaManut, manutServicoId, profissional]);

  function alternarManutencao() {
    setManutAtiva((atual) => {
      const proxima = !atual;
      if (proxima) {
        setDiaManut(somarDiasKey(dia, config.maintenanceNoticeDay));
        setHoraManut("");
      }
      return proxima;
    });
  }

  const todosClientes = useMemo(() => {
    const ids = new Set(clientes.map((c) => c.id));
    return [...extraClientes.filter((c) => !ids.has(c.id)), ...clientes];
  }, [clientes, extraClientes]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return todosClientes;
    const digitos = q.replace(/\D/g, "");
    return todosClientes.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        (digitos.length >= 2 && c.telefone.includes(digitos)),
    );
  }, [busca, todosClientes]);

  const gruposServicos = useMemo(() => {
    const grupos = new Map<ServiceCategory, AgendaServico[]>();
    for (const s of servicos) {
      const lista = grupos.get(s.categoria) ?? [];
      lista.push(s);
      grupos.set(s.categoria, lista);
    }
    return (Object.keys(SERVICE_CATEGORIES) as ServiceCategory[])
      .filter((cat) => grupos.has(cat))
      .map((cat) => ({ categoria: cat, itens: grupos.get(cat)! }));
  }, [servicos]);

  const sinal = useMemo(() => {
    if (!cliente || !servico) return null;
    return computeDeposit({
      policy: {
        depositType: config.depositType,
        depositValue: config.depositValue,
        noShowThreshold: config.noShowThreshold,
      },
      serviceRequiresDeposit: servico.exigeSinal,
      clientNoShowCount: cliente.faltas,
      priceCents: servico.precoCents,
    });
  }, [cliente, servico, config]);

  const inicioEscolhido = useMemo(
    () => (dia && hora ? localToUtc(dia, hora, config.timezone) : null),
    [dia, hora, config.timezone],
  );
  const antecedenciaCurta =
    inicioEscolhido !== null &&
    config.minAdvanceHours > 0 &&
    inicioEscolhido.getTime() < Date.now() + config.minAdvanceHours * 3_600_000;

  function selecionarCliente(c: AgendaCliente) {
    setCliente(c);
    setAvisoCliente(null);
    setEtapa((e) => (e < 2 ? 2 : e));
  }

  /** Abre o cadastro rápido já com o que foi digitado na busca (nome ou WhatsApp). */
  function abrirCadastro() {
    const termo = busca.trim();
    if (termo.replace(/\D/g, "").length >= 8) setNovoZap(termo);
    else if (termo) setNovoNome(termo);
    setCadastroAberto(true);
  }

  function salvarClienteRapido() {
    setErroCadastro(null);
    if (novoNome.trim().length < 2) {
      setErroCadastro("Informe o nome da cliente.");
      return;
    }
    if (!isValidPhone(novoZap)) {
      setErroCadastro("WhatsApp inválido — use DDD + número (ex.: 48 99999-8888).");
      return;
    }
    startCadastro(async () => {
      const res = await criarClienteRapido({ nome: novoNome.trim(), whatsapp: novoZap });
      if (!res.ok) {
        setErroCadastro(res.erro);
        return;
      }
      setExtraClientes((lista) => [res.cliente, ...lista]);
      setCadastroAberto(false);
      setNovoNome("");
      setNovoZap("");
      selecionarCliente(res.cliente);
      // Mesmo WhatsApp de uma cliente do estúdio: o cadastro dela é reaproveitado.
      // Fora do escopo da funcionária, nada da cliente aparece antes de agendar.
      if (res.jaExistia) {
        setAvisoCliente(
          res.oculta
            ? "Esse WhatsApp já tem cadastro no estúdio. O horário fica nesse cadastro, sem duplicar."
            : `Esse WhatsApp já era de ${res.cliente.nome}. Usamos o cadastro dela, sem duplicar.`,
        );
      }
    });
  }

  function trocarParaAplicacao() {
    const sugestao = manut?.sugestao;
    if (!sugestao) return;
    const completo = servicos.find((s) => s.id === sugestao.id);
    setServico(
      completo ?? {
        id: sugestao.id,
        nome: sugestao.nome,
        categoria: "APLICACAO",
        duracaoMin: sugestao.duracaoMin,
        precoCents: sugestao.precoCents,
        exigeSinal: sugestao.exigeSinal,
        manutencaoDeId: null,
      },
    );
    setManut(null);
    setHora("");
    setManutAtiva(false);
    setHoraManut("");
  }

  function agendar() {
    if (!cliente || !servico || !dia || !hora) return;
    if (manutAtiva && (!diaManut || !horaManut)) return;
    setErro(null);
    startEnvio(async () => {
      const res = await criarAgendamento({
        clienteId: cliente.id,
        servicoId: servico.id,
        dia,
        hora,
        observacoes: observacoes.trim() || undefined,
        manutencao:
          manutAtiva && diaManut && horaManut
            ? { dia: diaManut, hora: horaManut }
            : undefined,
        profissional,
        clienteTelefone: cliente.telefone,
      });
      if (!res.ok) {
        setErro(res.erro);
        return;
      }
      onCriado({ dia, aviso: res.aviso, proKey: profissional ?? null });
    });
  }

  const podeAgendar = etapa === 3 && Boolean(hora) && !enviando && !(manutAtiva && !horaManut);
  const quando =
    hora && dia
      ? `${formatDateShort(dayKeyToUtcStart(dia, config.timezone), config.timezone)} às ${hora}`
      : null;
  const resumoLinha1 = cliente
    ? `${cliente.nome}${servico ? ` · ${servico.nome}` : ""}`
    : "Escolha a cliente";
  const resumoLinha2 = servico
    ? [
        quando ?? `${servico.duracaoMin} min`,
        proEscolhida && etapa === 3
          ? `com ${proEscolhida.rotulo === "Você" ? "você" : proEscolhida.rotulo}`
          : null,
        formatBRL(servico.precoCents),
        sinal?.required ? `sinal ${formatBRL(sinal.depositCents)}` : null,
        manutAtiva && horaManut ? "+ manutenção" : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : cliente
      ? "Agora escolha o serviço"
      : "Depois o serviço e o horário";

  const rodape = (
    <div className="flex items-center gap-3">
      <div className="min-w-0 grow">
        <p className="truncate text-[14px] font-semibold text-ink">{resumoLinha1}</p>
        <p className="truncate text-[12.5px] tabular-nums text-ink-soft">{resumoLinha2}</p>
      </div>
      <Button onClick={agendar} disabled={!podeAgendar} className="shrink-0">
        {enviando
          ? "Agendando…"
          : etapa === 3 && !hora
            ? "Escolha o horário"
            : manutAtiva && !horaManut
              ? "Falta a manutenção"
              : "Agendar"}
      </Button>
    </div>
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Novo agendamento"
      description="Cliente, serviço e horário. O resumo fica aqui embaixo até você confirmar."
      footer={rodape}
      tall
    >
      <div className="space-y-4">
        {/* Resumo das escolhas feitas */}
        {cliente ? (
          <div className="space-y-2.5">
            <ResumoEscolha
              rotulo="Cliente"
              valor={cliente.nome}
              detalhe={formatPhone(cliente.telefone)}
              onTrocar={() => {
                setCliente(null);
                setServico(null);
                setEtapa(1);
              }}
            />
            {servico ? (
              <ResumoEscolha
                rotulo="Serviço"
                valor={servico.nome}
                detalhe={`${servico.duracaoMin} min · ${formatBRL(servico.precoCents)}`}
                onTrocar={() => {
                  setServico(null);
                  setManutAtiva(false);
                  setHoraManut("");
                  setEtapa(2);
                }}
              />
            ) : null}
            {avisoCliente ? (
              <p className="rounded-[16px] bg-surface-sunken px-4 py-2.5 text-[13.5px] text-ink">
                {avisoCliente}
              </p>
            ) : null}
            {cliente.temContraindicacao ? (
              <ContraindicacaoAlert flags={cliente.flags} />
            ) : null}
          </div>
        ) : null}

        {/* Etapa 1 — cliente */}
        {etapa === 1 ? (
          <div className="space-y-3">
            <div className="relative">
              <IconSearch
                width={17}
                height={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
              />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou WhatsApp"
                className="pl-10"
                autoFocus
              />
            </div>

            {!cadastroAberto ? (
              <button
                onClick={abrirCadastro}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-[14px] border border-dashed border-line-strong text-[14px] font-semibold text-ink hover:bg-surface-muted"
              >
                <IconPlus width={18} height={18} />
                Cadastrar nova cliente
              </button>
            ) : (
              <div className="rounded-xl border border-line p-3.5 space-y-3 bg-surface-sunken/40">
                <Field label="Nome" htmlFor="novo-nome">
                  <Input
                    id="novo-nome"
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    placeholder="Nome da cliente"
                  />
                </Field>
                <Field label="WhatsApp" htmlFor="novo-zap">
                  <Input
                    id="novo-zap"
                    value={novoZap}
                    onChange={(e) => setNovoZap(e.target.value)}
                    placeholder="(48) 99999-8888"
                    inputMode="tel"
                  />
                </Field>
                {erroCadastro ? (
                  <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">
                    {erroCadastro}
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={salvarClienteRapido}
                    disabled={salvandoCliente}
                  >
                    {salvandoCliente ? "Salvando..." : "Salvar cliente"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setCadastroAberto(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            <ul className="divide-y divide-line/70 rounded-xl border border-line overflow-hidden">
              {filtrados.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-ink-faint">
                  Nenhuma cliente encontrada. Cadastre com o WhatsApp dela: se ela já é
                  cliente do estúdio, o cadastro é reaproveitado.
                </li>
              ) : (
                filtrados.slice(0, 30).map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => selecionarCliente(c)}
                      className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-surface-sunken/60"
                    >
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 font-medium text-[15px] text-ink truncate">
                          {c.nome}
                          {c.temContraindicacao ? (
                            <IconAlert
                              width={14}
                              height={14}
                              className="text-danger shrink-0"
                            />
                          ) : null}
                        </span>
                        <span className="block text-xs text-ink-soft">
                          {formatPhone(c.telefone)}
                        </span>
                      </span>
                      {c.faltas > 0 ? (
                        <Badge tone="danger">
                          {c.faltas} falta{c.faltas === 1 ? "" : "s"}
                        </Badge>
                      ) : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}

        {/* Etapa 2 — serviço */}
        {etapa === 2 ? (
          <div className="space-y-4">
            {gruposServicos.length === 0 ? (
              <p className="text-sm text-ink-faint text-center py-6">
                Nenhum serviço ativo. Cadastre serviços em Serviços.
              </p>
            ) : (
              gruposServicos.map(({ categoria, itens }) => (
                <div key={categoria}>
                  <p className="mb-2 text-[13px] font-semibold text-ink">
                    {SERVICE_CATEGORIES[categoria]}
                  </p>
                  <ul className="rounded-[16px] border border-line divide-y divide-line overflow-hidden">
                    {itens.map((s) => (
                      <li key={s.id}>
                        <button
                          onClick={() => {
                            setServico(s);
                            setEtapa(3);
                          }}
                          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-muted"
                        >
                          <span className="min-w-0">
                            <span className="block font-medium text-[15px] text-ink truncate">
                              {s.nome}
                            </span>
                            <span className="block text-xs text-ink-soft">
                              {s.duracaoMin} min
                            </span>
                          </span>
                          <span className="font-medium text-sm text-ink shrink-0">
                            {formatBRL(s.precoCents)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        ) : null}

        {/* Etapa 3 — data, hora e confirmação */}
        {etapa === 3 && servico && cliente ? (
          <div className="space-y-4">
            {escolhePro ? (
              <div>
                <p id="ag-pro-rotulo" className="mb-2 text-[13px] font-semibold text-ink">
                  Profissional
                </p>
                <div role="group" aria-labelledby="ag-pro-rotulo" className="flex flex-wrap gap-2">
                  {equipe.map((p) => {
                    const marcada = p.key === proKey;
                    return (
                      <Chip
                        key={p.key}
                        size="sm"
                        selected={marcada}
                        onClick={() => setProKey(p.key)}
                        className="h-9 px-3.5 text-[13.5px]"
                      >
                        <ProDot
                          cor={p.cor}
                          className={cn("ring-[1.5px]", marcada ? "ring-accent-ink" : "ring-surface")}
                        />
                        {p.rotulo}
                      </Chip>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[12.5px] leading-snug text-ink-soft">
                  Os horários livres abaixo são os da agenda de quem vai atender.
                </p>
              </div>
            ) : null}

            <Field label="Data" htmlFor="ag-dia">
              <Input
                id="ag-dia"
                type="date"
                value={dia}
                onChange={(e) => {
                  setDia(e.target.value);
                  setHora("");
                }}
              />
            </Field>

            <div>
              <p className="mb-2 text-[13px] font-semibold text-ink">Horários livres</p>
              {slots === null ? (
                <p className="text-sm text-ink-faint py-2">Buscando horários...</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-ink-faint py-2">
                  Nenhum horário livre nesse dia — escolha outro dia ou informe a hora
                  manualmente.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.map((s) => (
                    <Chip
                      key={s}
                      size="sm"
                      selected={hora === s}
                      onClick={() => setHora(s)}
                      className="h-9 px-3.5 text-[13.5px] tabular-nums"
                    >
                      {s}
                    </Chip>
                  ))}
                </div>
              )}
            </div>

            <Field
              label="Ou informe a hora"
              htmlFor="ag-hora"
              hint="Entrada manual passa pela mesma validação de conflitos."
            >
              <Input
                id="ag-hora"
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
              />
            </Field>

            {/* Regra de ouro da manutenção */}
            {manut ? (
              <div className="bg-warning-soft text-warning rounded-[16px] px-4 py-3 space-y-2.5">
                <div className="flex items-start gap-2">
                  <IconAlert width={18} height={18} className="shrink-0 mt-0.5" />
                  <p className="text-sm">{manut.message}</p>
                </div>
                {manut.sugestao ? (
                  <Button size="sm" onClick={trocarParaAplicacao} className="w-full">
                    <IconCheck width={16} height={16} />
                    Trocar para {manut.sugestao.nome} —{" "}
                    {formatBRL(manut.sugestao.precoCents)}
                  </Button>
                ) : null}
              </div>
            ) : null}

            <Field label="Observações (opcional)" htmlFor="ag-obs">
              <Textarea
                id="ag-obs"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Alguma anotação para esse horário"
                className="min-h-16"
              />
            </Field>

            {sinal?.required ? (
              <div className="rounded-[16px] bg-surface-sunken px-4 py-3 text-[13.5px] text-ink">
                <p className="font-semibold">
                  Sinal de {formatBRL(sinal.depositCents)} será exigido
                </p>
                <p className="mt-0.5">
                  {sinal.reason === "NO_SHOW"
                    ? `Cliente com ${cliente.faltas} falta${cliente.faltas === 1 ? "" : "s"} — a política do estúdio pede sinal.`
                    : "Esse serviço exige sinal para reservar."}{" "}
                  O horário entra como pré-agendado até o sinal ser recebido.
                </p>
              </div>
            ) : null}

            {antecedenciaCurta ? (
              <p className="text-[13.5px] text-warning bg-warning-soft rounded-[16px] px-4 py-2.5">
                Menos de {config.minAdvanceHours}h de antecedência — tudo bem por ser
                agendamento interno, só confira se dá tempo.
              </p>
            ) : null}

            {/* Já programar a manutenção do ciclo */}
            {manutServico ? (
              <div
                className={cn(
                  "rounded-[16px] border px-4 py-3 space-y-3",
                  manutAtiva ? "border-accent/30 bg-accent-soft/60" : "border-line",
                )}
              >
                <button
                  type="button"
                  onClick={alternarManutencao}
                  className="w-full flex items-center justify-between gap-3 text-left"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">
                      Já deixar a manutenção agendada
                    </span>
                    <span className="block text-xs text-ink-soft mt-0.5">
                      {manutServico.nome} · {formatBRL(manutServico.precoCents)} — sugestão:
                      dia {config.maintenanceNoticeDay} do ciclo (prazo até{" "}
                      {config.maintenanceLimitDays} dias)
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "shrink-0 h-6 w-10 rounded-full p-0.5 transition-colors",
                      manutAtiva ? "bg-accent" : "bg-line",
                    )}
                  >
                    <span
                      className={cn(
                        "block h-5 w-5 rounded-full bg-white shadow transition-transform",
                        manutAtiva && "translate-x-4",
                      )}
                    />
                  </span>
                </button>

                {manutAtiva ? (
                  <div className="space-y-3">
                    <Field label="Data da manutenção" htmlFor="manut-dia">
                      <Input
                        id="manut-dia"
                        type="date"
                        value={diaManut}
                        min={somarDiasKey(dia, 1)}
                        max={somarDiasKey(dia, config.maintenanceLimitDays)}
                        onChange={(e) => {
                          setDiaManut(e.target.value);
                          setHoraManut("");
                        }}
                      />
                    </Field>
                    {slotsManut === null ? (
                      <p className="text-sm text-ink-faint">Buscando horários...</p>
                    ) : slotsManut.length === 0 ? (
                      <p className="text-sm text-ink-faint">
                        Nenhum horário livre nesse dia — tente outro dentro do ciclo.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {slotsManut.map((s) => (
                          <Chip
                            key={s}
                            size="sm"
                            selected={horaManut === s}
                            onClick={() => setHoraManut(s)}
                            className="h-9 px-3.5 text-[13.5px] tabular-nums"
                          >
                            {s}
                          </Chip>
                        ))}
                      </div>
                    )}
                    {horaManut ? (
                      <p className="text-[12.5px] font-semibold text-ink">
                        Manutenção: {diaManut.split("-").reverse().join("/")} às{" "}
                        {horaManut}
                      </p>
                    ) : (
                      <p className="text-xs text-ink-faint">
                        Escolha o horário da manutenção (ou desligue a opção).
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}

            {erro ? (
              <p className="text-[13.5px] text-danger bg-danger-soft rounded-[16px] px-4 py-2.5">
                {erro}
              </p>
            ) : null}

          </div>
        ) : null}
      </div>
    </Sheet>
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
    <div className="flex items-center justify-between gap-3 rounded-[16px] border border-line px-4 py-2.5">
      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-ink-soft">{rotulo}</p>
        <p className="font-semibold text-[15px] text-ink truncate">
          {valor}
          {detalhe ? (
            <span className="text-ink-soft font-normal text-sm"> · {detalhe}</span>
          ) : null}
        </p>
      </div>
      <button
        type="button"
        onClick={onTrocar}
        className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold text-ink-soft hover:bg-surface-sunken hover:text-ink"
      >
        Trocar
      </button>
    </div>
  );
}
