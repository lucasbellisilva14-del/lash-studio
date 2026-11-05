/**
 * GET /api/cron/whatsapp — envio automático da fila pelo WhatsApp conectado.
 * Chamado a cada minuto por um pinger externo (cron-job.org) com
 * "Authorization: Bearer <CRON_SECRET>".
 *
 * Cuidados contra banimento (o WhatsApp conectado é o da própria lash):
 * - uma mensagem por vez, com intervalo aleatório de 12 a 20 s por estúdio;
 * - "digitando..." antes de cada envio e um toque diferente em cada texto;
 * - só os tipos ligados pela dona e só para clientes da fila (horário marcado,
 *   atendida ou em acompanhamento); horário comercial; limite por dia.
 *
 * Três etapas por chamada:
 * 1. Saúde: confere cada conexão no servidor. Fechada por 3 min = caiu
 *    (um reinício do servidor fecha por segundos e não conta).
 * 2. Aviso: quem caiu recebe um push (uma vez, de dia) e volta para o manual.
 * 3. Envio: cada estúdio conectado manda a fila no próprio ritmo.
 */
import { prisma } from "@/lib/prisma";
import { localDayKey, formatTime } from "@/lib/dates";
import { buildMessageQueue, type QueueItem } from "@/lib/domain/queue";
import { acessoBloqueado } from "@/lib/domain/subscription";
import { firstName } from "@/lib/domain/templates";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import type { TemplateKind } from "@/lib/constants";
import { sendPushToProfessional } from "@/components/push/send";
import {
  WhatsAppErro,
  enviarTexto,
  estadoDaConexao,
  numeroInternacional,
  numeroNoWhatsapp,
  whatsappDisponivel,
} from "@/lib/whatsapp/evolution";
import {
  intervaloEntreMensagensMs,
  sorteador,
  tempoDigitandoMs,
  variarMensagem,
} from "@/lib/whatsapp/variacao";
import { TIPOS_AUTOMATICOS, dentroDaJanela, ehTipoAutomatico, tiposLigados } from "@/lib/whatsapp/tipos";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Só começa um envio até aqui (o pinger chama de novo no minuto seguinte). */
const ORCAMENTO_MS = 40_000;
/** Estúdios atendidos ao mesmo tempo. */
const ESTUDIOS_EM_PARALELO = 8;
/** Conexão fechada por mais que isso = caiu de verdade. */
const QUEDA_CONFIRMADA_MS = 3 * 60_000;
/** Depois de um erro do servidor, espera isso antes de tentar de novo. */
const PAUSA_APOS_ERRO_MS = 2 * 60_000;
const ORDEM: readonly TemplateKind[] = TIPOS_AUTOMATICOS;

function minutosLocais(agora: Date, tz: string): number {
  const [h, m] = formatTime(agora, tz).split(":").map(Number);
  return h * 60 + m;
}

const ignorarJanela = process.env.NODE_ENV !== "production" && process.env.WHATSAPP_IGNORAR_JANELA === "1";

function podeAgora(kind: TemplateKind, minutos: number): boolean {
  return ignorarJanela || dentroDaJanela(kind, minutos);
}

/** Aviso de queda só quando a dona está acordada; de madrugada espera a manhã. */
function horaDeAvisar(minutos: number): boolean {
  return ignorarJanela || (minutos >= 8 * 60 && minutos < 21 * 60);
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function emParalelo<T>(itens: T[], limite: number, fn: (item: T) => Promise<void>): Promise<void> {
  let proximo = 0;
  const trabalhadores = Array.from({ length: Math.min(limite, itens.length) }, async () => {
    while (proximo < itens.length) await fn(itens[proximo++]);
  });
  await Promise.all(trabalhadores);
}

function mensagemDeErro(e: unknown): string {
  return (e instanceof Error ? e.message : String(e)).slice(0, 500);
}

async function carregarConexoes() {
  return prisma.whatsAppConnection.findMany({
    where: {
      OR: [
        { status: "CONECTADO" },
        // Caiu e a dona ainda não foi avisada.
        { status: "DESCONECTADO", connectedAt: { not: null }, dropNotifiedAt: null },
      ],
    },
    include: {
      professional: {
        select: {
          id: true,
          timezone: true,
          subscriptionStatus: true,
          subscriptionPaidUntil: true,
          trialEndsAt: true,
        },
      },
    },
    // Quem espera há mais tempo vai primeiro.
    orderBy: { nextSendAt: { sort: "asc", nulls: "first" } },
  });
}

type Conexao = Awaited<ReturnType<typeof carregarConexoes>>[number];

// ── 1. Saúde ────────────────────────────────────────────────────────────────

/** Confere a conexão no servidor. Devolve true se pode enviar agora. */
async function conferirConexao(conexao: Conexao, agora: Date): Promise<boolean> {
  let estado;
  try {
    estado = await estadoDaConexao(conexao.instanceName);
  } catch (e) {
    // Servidor fora do ar: não envia nesta rodada e não conta como queda.
    console.error(`[whatsapp] estado indisponível (${conexao.professionalId}):`, mensagemDeErro(e));
    return false;
  }

  if (estado === "open") {
    if (conexao.closedSince) {
      await prisma.whatsAppConnection.update({ where: { id: conexao.id }, data: { closedSince: null } });
    }
    return true;
  }
  if (estado !== "close") return false; // "connecting": está voltando sozinha

  if (!conexao.closedSince) {
    await prisma.whatsAppConnection.update({ where: { id: conexao.id }, data: { closedSince: agora } });
    return false;
  }
  if (agora.getTime() - conexao.closedSince.getTime() >= QUEDA_CONFIRMADA_MS) {
    await prisma.whatsAppConnection.update({
      where: { id: conexao.id },
      data: {
        status: "DESCONECTADO",
        closedSince: null,
        lastError: "O WhatsApp foi desconectado (no celular ou no servidor).",
      },
    });
    conexao.status = "DESCONECTADO";
  }
  return false;
}

// ── 2. Aviso de queda ───────────────────────────────────────────────────────

async function avisarQueda(conexao: Conexao, agora: Date): Promise<void> {
  if (!horaDeAvisar(minutosLocais(agora, conexao.professional.timezone))) return;
  // Marca antes de avisar: nunca avisa duas vezes.
  const marcada = await prisma.whatsAppConnection.updateMany({
    where: { id: conexao.id, status: "DESCONECTADO", dropNotifiedAt: null },
    data: { dropNotifiedAt: agora },
  });
  if (marcada.count === 0) return;
  await sendPushToProfessional(conexao.professionalId, {
    title: "WhatsApp desconectado",
    body: "As mensagens automáticas pararam e ficaram na Fila. Conecte de novo em Configurações → WhatsApp.",
    url: "/config/whatsapp",
  }).catch(() => {});
}

// ── 3. Envio ────────────────────────────────────────────────────────────────

type Estado = {
  conexao: Conexao;
  /** Fila do estúdio filtrada e ordenada (montada no primeiro envio). */
  fila: QueueItem[] | null;
  proximoEnvio: number;
};

/**
 * Itens que o automático já tentou e o número não tem WhatsApp. Se a dona
 * corrigir o telefone da cliente, o número muda e o item volta a ser tentado.
 */
async function semWhatsapp(professionalId: string): Promise<Map<string, string>> {
  const desde = new Date(Date.now() - 45 * 24 * 3600_000);
  const logs = await prisma.messageLog.findMany({
    where: { professionalId, status: "SEM_WHATSAPP", createdAt: { gte: desde } },
    select: { kind: true, clientId: true, appointmentId: true, refDate: true, body: true },
  });
  return new Map(
    logs.map((l) => [
      `${l.kind}:${l.clientId}:${l.appointmentId ?? l.refDate?.toISOString() ?? ""}`,
      l.body,
    ]),
  );
}

async function montarFila(conexao: Conexao, agora: Date): Promise<QueueItem[]> {
  const ligados = tiposLigados(conexao.autoKinds);
  const minutos = minutosLocais(agora, conexao.professional.timezone);
  const [fila, pular] = await Promise.all([
    buildMessageQueue(conexao.professionalId, agora),
    semWhatsapp(conexao.professionalId),
  ]);
  return fila
    .filter((item) => {
      if (!ehTipoAutomatico(item.kind) || !ligados.has(item.kind)) return false;
      if (!podeAgora(item.kind, minutos)) return false;
      const tentativa = pular.get(item.key);
      return !(tentativa && tentativa.includes(normalizePhone(item.client.phone)));
    })
    .sort((a, b) => ORDEM.indexOf(a.kind) - ORDEM.indexOf(b.kind));
}

/** Já saiu, foi descartado ou está saindo (manual ou automático)? */
async function jaSaiu(professionalId: string, item: QueueItem): Promise<boolean> {
  const n = await prisma.messageLog.count({
    where: {
      professionalId,
      clientId: item.client.id,
      kind: item.kind,
      status: { in: ["ENVIADA", "DESCARTADA", "ENVIANDO"] },
      ...(item.appointmentId ? { appointmentId: item.appointmentId } : { refDate: item.refDate }),
    },
  });
  return n > 0;
}

type Resultado = "enviada" | "pulada" | "parar";

async function enviarProxima(estado: Estado): Promise<Resultado> {
  const { conexao } = estado;
  const agora = new Date();
  const hoje = localDayKey(agora, conexao.professional.timezone);
  const enviadasHoje = conexao.sentDay === hoje ? conexao.sentToday : 0;
  if (enviadasHoje >= conexao.dailyLimit) return "parar";

  estado.fila ??= await montarFila(conexao, agora);
  const item = estado.fila.shift();
  if (!item) return "parar";
  if (await jaSaiu(conexao.professionalId, item)) return "pulada";

  // Reserva a vez (duas chamadas cruzadas não mandam ao mesmo tempo).
  const reserva = await prisma.whatsAppConnection.updateMany({
    where: {
      id: conexao.id,
      status: "CONECTADO",
      autoSend: true,
      OR: [{ nextSendAt: null }, { nextSendAt: { lte: agora } }],
    },
    data: { nextSendAt: new Date(agora.getTime() + 60_000) },
  });
  if (reserva.count === 0) return "parar";

  const registro = {
    professionalId: conexao.professionalId,
    clientId: item.client.id,
    appointmentId: item.appointmentId,
    templateId: item.templateId,
    kind: item.kind,
    channel: "WHATSAPP",
    refDate: item.refDate,
    auto: true,
  };
  const rnd = sorteador(`${item.key}:${agora.getTime()}`);
  let pendenteId: string | null = null;
  try {
    const digitos = normalizePhone(item.client.phone);
    const numero = isValidPhone(digitos)
      ? await numeroNoWhatsapp(conexao.instanceName, numeroInternacional(digitos))
      : null;
    if (!numero) {
      await prisma.messageLog.create({
        data: {
          ...registro,
          body: `O número ${digitos || "(vazio)"} não tem WhatsApp. A mensagem ficou na Fila para envio manual.`,
          status: "SEM_WHATSAPP",
        },
      });
      // Não gastou a vez: o próximo item pode sair já.
      await prisma.whatsAppConnection.update({ where: { id: conexao.id }, data: { nextSendAt: agora } });
      return "pulada";
    }

    const texto = variarMensagem(item.body, firstName(item.client.name), rnd);
    // Registra antes de enviar: se esta chamada cair no meio do envio, o
    // automático não repete (o item continua na Fila manual, que só conta ENVIADA).
    const pendente = await prisma.messageLog.create({
      data: { ...registro, body: texto, status: "ENVIANDO" },
    });
    pendenteId = pendente.id;

    await enviarTexto(conexao.instanceName, numero, texto, tempoDigitandoMs(texto, rnd));

    const depois = new Date();
    const intervalo = intervaloEntreMensagensMs(rnd);
    await prisma.messageLog.update({
      where: { id: pendente.id },
      data: { status: "ENVIADA", sentAt: depois },
    });
    const atualizada = await prisma.whatsAppConnection.update({
      where: { id: conexao.id },
      data: {
        lastSentAt: depois,
        nextSendAt: new Date(depois.getTime() + intervalo),
        sentDay: hoje,
        sentToday: enviadasHoje + 1,
        lastError: null,
      },
    });
    estado.conexao = { ...conexao, ...atualizada };
    estado.proximoEnvio = depois.getTime() + intervalo;
    return "enviada";
  } catch (e) {
    const motivo = mensagemDeErro(e);
    console.error(`[whatsapp] envio falhou (${conexao.professionalId}):`, motivo);
    // O servidor respondeu com erro: não saiu, pode tentar de novo depois.
    // Sem resposta (tempo esgotado, rede caiu): pode ter saído, então o
    // registro "ENVIANDO" fica e o automático não repete.
    if (pendenteId && e instanceof WhatsAppErro) {
      await prisma.messageLog.delete({ where: { id: pendenteId } }).catch(() => {});
    }
    await prisma.whatsAppConnection.update({
      where: { id: conexao.id },
      data: { lastError: motivo, nextSendAt: new Date(Date.now() + PAUSA_APOS_ERRO_MS) },
    });
    return "parar";
  }
}

async function enviarDoEstudio(conexao: Conexao, inicio: number): Promise<number> {
  const estado: Estado = { conexao, fila: null, proximoEnvio: conexao.nextSendAt?.getTime() ?? 0 };
  let enviadas = 0;
  while (Date.now() - inicio < ORCAMENTO_MS) {
    const espera = estado.proximoEnvio - Date.now();
    if (espera > 0) {
      if (Date.now() - inicio + espera > ORCAMENTO_MS) break; // fica para a próxima chamada
      await esperar(espera);
    }
    const resultado = await enviarProxima(estado);
    if (resultado === "enviada") enviadas += 1;
    if (resultado === "parar") break;
  }
  return enviadas;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (!whatsappDisponivel()) {
    return Response.json({ ok: true, ignorado: "servidor de WhatsApp não configurado" });
  }

  const inicio = Date.now();
  const agora = new Date();
  const conexoes = await carregarConexoes();

  const prontas: Conexao[] = [];
  await emParalelo(
    conexoes.filter((c) => c.status === "CONECTADO"),
    ESTUDIOS_EM_PARALELO,
    async (conexao) => {
      if ((await conferirConexao(conexao, agora)) && conexao.autoSend && !acessoBloqueado(conexao.professional, agora)) {
        prontas.push(conexao);
      }
    },
  );

  const caidas = conexoes.filter((c) => c.status === "DESCONECTADO" && c.connectedAt && !c.dropNotifiedAt);
  await Promise.all(caidas.map((c) => avisarQueda(c, agora)));

  // Quem espera há mais tempo vai primeiro (a conferência acima termina fora de ordem).
  prontas.sort((a, b) => (a.nextSendAt?.getTime() ?? 0) - (b.nextSendAt?.getTime() ?? 0));
  let enviadas = 0;
  await emParalelo(prontas, ESTUDIOS_EM_PARALELO, async (conexao) => {
    enviadas += await enviarDoEstudio(conexao, inicio);
  });

  return Response.json({
    ok: true,
    conectados: prontas.length,
    avisosDeQueda: caidas.length,
    enviadas,
    ms: Date.now() - inicio,
  });
}
