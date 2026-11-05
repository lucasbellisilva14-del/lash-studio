"use client";

/**
 * Conexão do WhatsApp do estúdio: código de 8 letras (quando o LashOS está
 * no mesmo celular do WhatsApp) ou QR code (computador/tablet), espera a
 * leitura, e depois as opções do envio automático.
 */
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { IconAlert, IconCheck, IconCopy, IconWhatsApp } from "@/components/ui/icons";
import { IconShield } from "@/components/config/icons";
import { FormError, SavedToast } from "@/components/config/feedback";
import { cn } from "@/lib/cn";
import {
  LIMITES_DIARIOS,
  TIPOS_AUTOMATICOS,
  TIPOS_AUTOMATICOS_INFO,
  type TipoAutomatico,
} from "@/lib/whatsapp/tipos";
import {
  conectarWhatsapp,
  conferirWhatsapp,
  desconectarWhatsapp,
  enviarTesteWhatsapp,
  salvarEnvioAutomatico,
  type EstadoConexao,
} from "./actions";

type Config = { autoSend: boolean; tipos: TipoAutomatico[]; limite: number };

type Props = {
  disponivel: boolean;
  conectado: boolean;
  instavel: boolean;
  telefone: string | null;
  perfil: string | null;
  telefoneDoEstudio: string;
  config: Config;
  enviadasHoje: number;
  recentes: { id: string; nome: string; tipo: string; hora: string }[];
};

type Metodo = "codigo" | "qr";

export function WhatsappManager(props: Props) {
  if (!props.disponivel) {
    return (
      <Card>
        <CardBody>
          <p className="text-[15px] font-semibold text-ink">Em preparação</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">
            O envio automático pelo WhatsApp ainda não foi liberado neste servidor. Enquanto isso, a
            Fila de mensagens continua funcionando em um toque.
          </p>
        </CardBody>
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      {props.conectado ? <Conectado {...props} /> : <Conectar telefoneDoEstudio={props.telefoneDoEstudio} />}
      <Cuidados />
    </div>
  );
}

// ── Conectar ────────────────────────────────────────────────────────────────

function Conectar({ telefoneDoEstudio }: { telefoneDoEstudio: string }) {
  const router = useRouter();
  // Computador ou tablet com mouse começa pelo QR code; no celular, pelo código.
  const temMouse = useSyncExternalStore(
    () => () => {},
    () => window.matchMedia("(pointer: fine)").matches,
    () => false,
  );
  const [escolhido, setMetodo] = useState<Metodo | null>(null);
  const metodo: Metodo = escolhido ?? (temMouse ? "qr" : "codigo");
  const [telefone, setTelefone] = useState(telefoneDoEstudio);
  const [tentativa, setTentativa] = useState<Extract<EstadoConexao, { estado: "CONECTANDO" }> | null>(null);
  const [expirou, setExpirou] = useState(false);
  const [conectou, setConectou] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [copiado, setCopiado] = useState(false);

  // Enquanto espera a leitura, pergunta ao servidor a cada 3 s.
  const ativa = tentativa !== null;
  useEffect(() => {
    if (!ativa) return;
    let vivo = true;
    let timer: ReturnType<typeof setTimeout>;
    const perguntar = async () => {
      const r = await conferirWhatsapp().catch(() => null);
      if (!vivo) return;
      if (r?.ok && r.estado === "CONECTADO") {
        setTentativa(null);
        setConectou(true);
        router.refresh();
        return;
      }
      if (r?.ok && r.estado === "DESCONECTADO") {
        setTentativa(null);
        setExpirou(true);
        return;
      }
      if (r?.ok && r.estado === "CONECTANDO") {
        setTentativa((atual) =>
          atual
            ? {
                ...atual,
                qrBase64: r.qrBase64 ?? atual.qrBase64,
                pairingCode: r.pairingCode ?? atual.pairingCode,
              }
            : atual,
        );
      }
      timer = setTimeout(perguntar, 3000);
    };
    timer = setTimeout(perguntar, 3000);
    return () => {
      vivo = false;
      clearTimeout(timer);
    };
  }, [ativa, router]);

  function comecar() {
    setError(undefined);
    setExpirou(false);
    startTransition(async () => {
      const r = await conectarWhatsapp(metodo, telefone);
      if (!r.ok) return setError(r.error);
      if (r.estado === "CONECTADO") {
        setConectou(true);
        router.refresh();
      } else if (r.estado === "CONECTANDO") setTentativa(r);
    });
  }

  function cancelar() {
    setTentativa(null);
    startTransition(async () => {
      await desconectarWhatsapp();
    });
  }

  async function copiarCodigo(codigo: string) {
    try {
      await navigator.clipboard.writeText(codigo.replace(/\W/g, ""));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // sem área de transferência
    }
  }

  if (conectou) {
    return (
      <Card>
        <CardBody className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success-soft text-success">
            <IconCheck width={20} height={20} />
          </span>
          <p className="text-[15px] font-semibold text-ink">Conectado! Carregando...</p>
        </CardBody>
      </Card>
    );
  }

  if (tentativa) {
    const codigo = tentativa.pairingCode;
    return (
      <Card>
        <CardBody>
          {metodo === "codigo" ? (
            <>
              <p className="text-[15px] font-semibold text-ink">Digite este código no WhatsApp</p>
              <div className="mt-4 flex flex-col items-center gap-3 rounded-[18px] bg-surface-sunken px-4 py-5">
                {codigo ? (
                  <>
                    <p className="font-mono text-[32px] font-bold tracking-[0.18em] text-ink">
                      {formatarCodigo(codigo)}
                    </p>
                    <Button variant="secondary" size="sm" onClick={() => copiarCodigo(codigo)}>
                      {copiado ? <IconCheck width={15} height={15} /> : <IconCopy width={15} height={15} />}
                      {copiado ? "Copiado" : "Copiar código"}
                    </Button>
                  </>
                ) : (
                  <p className="py-3 text-[14px] text-ink-soft">Gerando o código...</p>
                )}
              </div>
              <ol className="mt-4 space-y-2 text-[13.5px] leading-snug text-ink-soft">
                <Passo n={1}>
                  Abra o <b className="text-ink">WhatsApp</b> → <b className="text-ink">Configurações</b>{" "}
                  (no Android, toque nos três pontinhos) → <b className="text-ink">Aparelhos conectados</b>.
                </Passo>
                <Passo n={2}>
                  Toque em <b className="text-ink">Conectar um aparelho</b> e depois em{" "}
                  <b className="text-ink">Conectar com número de telefone</b>, embaixo da câmera.
                </Passo>
                <Passo n={3}>Digite o código acima. Ele muda sozinho de tempos em tempos: use sempre o que estiver na tela.</Passo>
              </ol>
            </>
          ) : (
            <>
              <p className="text-[15px] font-semibold text-ink">Leia o QR code com o celular</p>
              <div className="mt-4 flex justify-center rounded-[18px] bg-white p-4">
                {tentativa.qrBase64 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={tentativa.qrBase64} alt="QR code para conectar o WhatsApp" className="h-60 w-60" />
                ) : (
                  <p className="flex h-60 items-center text-[14px] text-ink-soft">Gerando o QR code...</p>
                )}
              </div>
              <ol className="mt-4 space-y-2 text-[13.5px] leading-snug text-ink-soft">
                <Passo n={1}>
                  No celular, abra o <b className="text-ink">WhatsApp</b> → <b className="text-ink">Configurações</b>{" "}
                  (no Android, três pontinhos) → <b className="text-ink">Aparelhos conectados</b>.
                </Passo>
                <Passo n={2}>
                  Toque em <b className="text-ink">Conectar um aparelho</b> e aponte a câmera para o código.
                </Passo>
              </ol>
            </>
          )}
          <p className="mt-4 flex items-center gap-2 text-[13px] text-ink-faint">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent" /> Esperando o WhatsApp...
          </p>
          <Button variant="ghost" className="mt-2 w-full" disabled={pending} onClick={cancelar}>
            Cancelar
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink">
            <IconWhatsApp width={20} height={20} />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-ink">Conecte o WhatsApp do estúdio</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">
              Confirmações, lembretes e cuidados saem sozinhos pelo seu número, uma mensagem por vez.
              O LashOS só envia: não lê nem guarda as suas conversas.
            </p>
          </div>
        </div>

        {expirou ? (
          <p className="mt-4 rounded-[14px] bg-warning-soft px-3.5 py-2.5 text-[13.5px] text-warning">
            O código expirou antes da conexão. Gere outro e conecte com calma.
          </p>
        ) : null}

        <p className="mb-2 mt-5 text-[13px] font-semibold text-ink-soft">Onde você está agora?</p>
        <Segmented
          options={[
            { value: "codigo", label: "No celular do WhatsApp" },
            { value: "qr", label: "No computador" },
          ]}
          value={metodo}
          onChange={setMetodo}
          size="sm"
        />

        {metodo === "codigo" ? (
          <div className="mt-4">
            <Field label="Número do WhatsApp do estúdio" htmlFor="wa-numero">
              <Input
                id="wa-numero"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(48) 99999-9999"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
            </Field>
            <Button size="lg" className="mt-3" disabled={pending} onClick={comecar}>
              {pending ? "Gerando..." : "Gerar código de conexão"}
            </Button>
          </div>
        ) : (
          <Button size="lg" className="mt-4" disabled={pending} onClick={comecar}>
            {pending ? "Gerando..." : "Mostrar QR code"}
          </Button>
        )}
        <div className="mt-3">
          <FormError error={error} />
        </div>
      </CardBody>
    </Card>
  );
}

function formatarCodigo(codigo: string): string {
  const limpo = codigo.replace(/\W/g, "").toUpperCase();
  return limpo.length === 8 ? `${limpo.slice(0, 4)}-${limpo.slice(4)}` : limpo;
}

function Passo({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-[11px] font-bold text-ink">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}

// ── Conectado ───────────────────────────────────────────────────────────────

function Conectado({ instavel, telefone, perfil, config, enviadasHoje, recentes }: Props) {
  const router = useRouter();
  const [cfg, setCfg] = useState<Config>(config);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [savedAt, setSavedAt] = useState<number>();
  const [aviso, setAviso] = useState<string>();
  const [confirmando, setConfirmando] = useState(false);

  function salvar(novo: Config) {
    const anterior = cfg;
    setCfg(novo);
    setError(undefined);
    startTransition(async () => {
      const r = await salvarEnvioAutomatico(novo);
      if (r.ok) setSavedAt(Date.now());
      else {
        setCfg(anterior);
        setError(r.error);
      }
    });
  }

  function alternarTipo(tipo: TipoAutomatico) {
    const tipos = cfg.tipos.includes(tipo) ? cfg.tipos.filter((t) => t !== tipo) : [...cfg.tipos, tipo];
    salvar({ ...cfg, tipos: TIPOS_AUTOMATICOS.filter((t) => tipos.includes(t)) });
  }

  function testar() {
    setError(undefined);
    startTransition(async () => {
      const r = await enviarTesteWhatsapp();
      if (r.ok) setAviso("Teste enviado: veja na conversa “Você” do seu WhatsApp.");
      else setError(r.error);
    });
  }

  function desconectar() {
    startTransition(async () => {
      await desconectarWhatsapp();
      setConfirmando(false);
      router.refresh();
    });
  }

  return (
    <>
      <Card>
        <CardBody>
          <div className="flex items-center gap-3">
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
              <IconWhatsApp width={21} height={21} />
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface bg-success" />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-ink">Conectado</p>
              <p className="truncate text-[13px] text-ink-soft">
                {[perfil, telefone].filter(Boolean).join(" · ") || "WhatsApp do estúdio"}
              </p>
            </div>
          </div>
          {instavel ? (
            <p className="mt-4 flex gap-2 rounded-[14px] bg-warning-soft px-3.5 py-2.5 text-[13px] leading-snug text-warning">
              <IconAlert width={16} height={16} className="mt-0.5 shrink-0" />
              O servidor não está achando a conexão agora. Se não voltar em alguns minutos, desconecte e
              conecte de novo.
            </p>
          ) : null}
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-[14px] bg-surface-sunken px-3.5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-faint">Hoje</p>
              <p className="mt-0.5 text-[20px] font-bold tracking-[-0.02em] text-ink">
                {enviadasHoje}
                <span className="text-[13px] font-medium text-ink-faint"> de {cfg.limite}</span>
              </p>
            </div>
            <div className="rounded-[14px] bg-surface-sunken px-3.5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-faint">Entre mensagens</p>
              <p className="mt-0.5 text-[20px] font-bold tracking-[-0.02em] text-ink">
                12–20<span className="text-[13px] font-medium text-ink-faint"> s</span>
              </p>
            </div>
          </div>
          {recentes.length > 0 ? (
            <ul className="mt-4 divide-y divide-line">
              {recentes.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-[13.5px]">
                  <span className="min-w-0 truncate text-ink">
                    {r.nome} <span className="text-ink-faint">· {r.tipo}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-ink-faint">{r.hora}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-ink">Envio automático</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">
                {cfg.autoSend
                  ? "Ligado: as mensagens marcadas abaixo saem sozinhas."
                  : "Desligado: tudo fica na Fila para você mandar em um toque."}
              </p>
            </div>
            <Interruptor
              ligado={cfg.autoSend}
              disabled={pending}
              onClick={() => salvar({ ...cfg, autoSend: !cfg.autoSend })}
              label="Envio automático"
            />
          </div>

          <div className={cn("mt-4 space-y-1", !cfg.autoSend && "opacity-50")}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-faint">Sai sozinho</p>
            {TIPOS_AUTOMATICOS.map((tipo) => {
              const marcado = cfg.tipos.includes(tipo);
              return (
                <label key={tipo} className="flex cursor-pointer items-center gap-3 rounded-[12px] py-2">
                  <input
                    type="checkbox"
                    checked={marcado}
                    disabled={pending || !cfg.autoSend}
                    onChange={() => alternarTipo(tipo)}
                    className="h-5 w-5 shrink-0 accent-[var(--color-accent)]"
                  />
                  <span className="min-w-0">
                    <span className="block text-[14.5px] font-medium text-ink">{TIPOS_AUTOMATICOS_INFO[tipo].label}</span>
                    <span className="block text-[12.5px] text-ink-soft">{TIPOS_AUTOMATICOS_INFO[tipo].dica}</span>
                  </span>
                </label>
              );
            })}
            <p className="pt-1 text-[12.5px] text-ink-faint">Aniversário e resgate continuam com você, em um toque.</p>
          </div>

          <div className={cn("mt-4", !cfg.autoSend && "opacity-50")}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
              Limite por dia
            </p>
            <Segmented
              options={LIMITES_DIARIOS.map((n) => ({ value: String(n), label: `${n} mensagens` }))}
              value={String(cfg.limite)}
              onChange={(v) => salvar({ ...cfg, limite: Number(v) })}
              size="sm"
            />
          </div>
        </CardBody>
      </Card>

      {aviso ? (
        <p className="rounded-[14px] bg-success-soft px-3.5 py-2.5 text-[13.5px] text-success">{aviso}</p>
      ) : null}
      <FormError error={error} />

      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" disabled={pending} onClick={testar}>
          Testar envio
        </Button>
        {confirmando ? (
          <Button variant="danger" className="flex-1" disabled={pending} onClick={desconectar}>
            {pending ? "Desconectando..." : "Desconectar mesmo?"}
          </Button>
        ) : (
          <Button variant="danger-soft" className="flex-1" onClick={() => setConfirmando(true)}>
            Desconectar
          </Button>
        )}
      </div>
      <SavedToast savedAt={savedAt} />
    </>
  );
}

function Interruptor({
  ligado,
  disabled,
  onClick,
  label,
}: {
  ligado: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors",
        ligado ? "bg-accent" : "border border-line bg-surface-sunken",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all",
          ligado ? "left-[calc(100%-26px)]" : "left-0.5",
        )}
      />
    </button>
  );
}

// ── Cuidados contra bloqueio ────────────────────────────────────────────────

function Cuidados() {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-2.5">
          <IconShield width={18} height={18} className="text-ink-soft" />
          <p className="text-[15px] font-semibold text-ink">Cuidados com o seu número</p>
        </div>
        <ul className="mt-3 space-y-2 text-[13px] leading-snug text-ink-soft">
          <li>• Uma mensagem por vez, com 12 a 20 segundos entre elas e “digitando...” antes.</li>
          <li>• Cada mensagem sai com um toque diferente na saudação e no emoji. Data, valor e Pix não mudam.</li>
          <li>• Só para clientes com horário marcado ou em acompanhamento. Nunca para lista fria.</li>
          <li>• Confirmações das 7h30 às 22h; o resto das 8h30 às 20h. E um limite por dia.</li>
          <li>• Se a conexão cair, tudo volta para a Fila e você recebe um aviso no celular.</li>
        </ul>
        <p className="mt-3 text-[12.5px] leading-relaxed text-ink-faint">
          O WhatsApp não tem conexão oficial para números comuns. Esse jeito é usado por muitos sistemas e os
          cuidados acima deixam o envio parecido com o seu, mas o risco de bloqueio não é zero. Use o número
          que você já usa com as clientes.
        </p>
      </CardBody>
    </Card>
  );
}
