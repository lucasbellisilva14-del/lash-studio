"use server";

/**
 * WhatsApp conectado do estúdio (só a dona): conectar por QR code ou por
 * código, conferir a tentativa, desconectar, ajustar o envio automático e
 * mandar um teste para o próprio número.
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/session";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import {
  apagarInstancia,
  desligar,
  enviarTexto,
  estadoDaConexao,
  garantirInstancia,
  nomeDaInstancia,
  numeroInternacional,
  pedirConexao,
  whatsappDisponivel,
} from "@/lib/whatsapp/evolution";
import { marcarConectado } from "@/lib/whatsapp/conexao";
import { LIMITES_DIARIOS, ehTipoAutomatico } from "@/lib/whatsapp/tipos";

export type EstadoConexao =
  | { estado: "CONECTADO"; phone: string | null; profileName: string | null }
  | { estado: "CONECTANDO"; qrBase64: string | null; pairingCode: string | null }
  | { estado: "DESCONECTADO"; expirou: boolean };

export type ResultadoWhatsapp<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const SEM_SERVIDOR = "O servidor de WhatsApp ainda não está configurado. Fale com o suporte.";
const FALHA_SERVIDOR = "Não consegui falar com o servidor de WhatsApp. Tente de novo em instantes.";

function atualizarTelas() {
  revalidatePath("/config/whatsapp");
  revalidatePath("/config");
  revalidatePath("/mensagens");
}

/** Começa uma conexão do zero: QR code (outro aparelho) ou código (mesmo celular). */
export async function conectarWhatsapp(
  metodo: "qr" | "codigo",
  telefone?: string,
): Promise<ResultadoWhatsapp<EstadoConexao>> {
  const { professionalId } = await requireOwner();
  if (!whatsappDisponivel()) return { ok: false, error: SEM_SERVIDOR };

  let numero: string | null = null;
  if (metodo === "codigo") {
    const digitos = normalizePhone(telefone ?? "");
    if (!isValidPhone(digitos)) return { ok: false, error: "Digite o número do WhatsApp com DDD." };
    numero = numeroInternacional(digitos);
  }

  const instanceName = nomeDaInstancia(professionalId);
  try {
    if ((await estadoDaConexao(instanceName)) === "open") {
      const conexao = await marcarConectado(professionalId, instanceName);
      atualizarTelas();
      return { ok: true, estado: "CONECTADO", phone: conexao.phone, profileName: conexao.profileName };
    }
    await apagarInstancia(instanceName);
    await garantirInstancia(instanceName);
    const codigo = await pedirConexao(instanceName, numero);
    await prisma.whatsAppConnection.upsert({
      where: { professionalId },
      create: { professionalId, instanceName, status: "CONECTANDO" },
      update: { instanceName, status: "CONECTANDO", lastError: null, closedSince: null },
    });
    return { ok: true, estado: "CONECTANDO", ...codigo };
  } catch (e) {
    console.error("[whatsapp] conectar:", e);
    return { ok: false, error: FALHA_SERVIDOR };
  }
}

/** Consulta a tentativa em andamento (a tela pergunta a cada 3 s). */
export async function conferirWhatsapp(): Promise<ResultadoWhatsapp<EstadoConexao>> {
  const { professionalId } = await requireOwner();
  if (!whatsappDisponivel()) return { ok: false, error: SEM_SERVIDOR };
  const conexao = await prisma.whatsAppConnection.findUnique({ where: { professionalId } });
  if (!conexao) return { ok: true, estado: "DESCONECTADO", expirou: false };
  try {
    const estado = await estadoDaConexao(conexao.instanceName);
    if (estado === "open") {
      const conectada = await marcarConectado(professionalId, conexao.instanceName);
      atualizarTelas();
      return { ok: true, estado: "CONECTADO", phone: conectada.phone, profileName: conectada.profileName };
    }
    if (conexao.status === "CONECTANDO" && estado === "connecting") {
      return { ok: true, estado: "CONECTANDO", ...(await pedirConexao(conexao.instanceName)) };
    }
    if (conexao.status === "CONECTANDO") {
      await prisma.whatsAppConnection.update({ where: { professionalId }, data: { status: "DESCONECTADO" } });
      return { ok: true, estado: "DESCONECTADO", expirou: true };
    }
    return conexao.status === "CONECTADO"
      ? { ok: true, estado: "CONECTADO", phone: conexao.phone, profileName: conexao.profileName }
      : { ok: true, estado: "DESCONECTADO", expirou: false };
  } catch (e) {
    console.error("[whatsapp] conferir:", e);
    return { ok: false, error: FALHA_SERVIDOR };
  }
}

/** Cancela uma tentativa ou desconecta (o aparelho some de "Aparelhos conectados"). */
export async function desconectarWhatsapp(): Promise<ResultadoWhatsapp> {
  const { professionalId } = await requireOwner();
  const conexao = await prisma.whatsAppConnection.findUnique({ where: { professionalId } });
  if (!conexao) return { ok: true };
  if (whatsappDisponivel()) {
    await desligar(conexao.instanceName).catch((e) => console.error("[whatsapp] logout:", e));
    await apagarInstancia(conexao.instanceName).catch((e) => console.error("[whatsapp] apagar:", e));
  }
  await prisma.whatsAppConnection.update({
    where: { professionalId },
    data: {
      status: "DESCONECTADO",
      connectedAt: null,
      phone: null,
      profileName: null,
      closedSince: null,
      nextSendAt: null,
      // Foi ela quem desconectou: nada de aviso de queda.
      dropNotifiedAt: new Date(),
    },
  });
  atualizarTelas();
  return { ok: true };
}

/** Liga/desliga o automático, os tipos que saem sozinhos e o limite por dia. */
export async function salvarEnvioAutomatico(input: {
  autoSend: boolean;
  tipos: string[];
  limite: number;
}): Promise<ResultadoWhatsapp> {
  const { professionalId } = await requireOwner();
  const tipos = [...new Set(input.tipos)].filter(ehTipoAutomatico);
  if (!(LIMITES_DIARIOS as readonly number[]).includes(input.limite)) {
    return { ok: false, error: "Limite por dia inválido." };
  }
  const data = { autoSend: Boolean(input.autoSend), autoKinds: tipos.join(","), dailyLimit: input.limite };
  await prisma.whatsAppConnection.upsert({
    where: { professionalId },
    create: { professionalId, instanceName: nomeDaInstancia(professionalId), ...data },
    update: data,
  });
  atualizarTelas();
  return { ok: true };
}

/** Mensagem de teste para o próprio número (aparece em "Você", no WhatsApp). */
export async function enviarTesteWhatsapp(): Promise<ResultadoWhatsapp> {
  const { professionalId } = await requireOwner();
  if (!whatsappDisponivel()) return { ok: false, error: SEM_SERVIDOR };
  const conexao = await prisma.whatsAppConnection.findUnique({ where: { professionalId } });
  if (!conexao || conexao.status !== "CONECTADO" || !conexao.phone) {
    return { ok: false, error: "Conecte o WhatsApp primeiro." };
  }
  try {
    await enviarTexto(
      conexao.instanceName,
      conexao.phone,
      "Teste do LashOS ✅\nSeu WhatsApp está conectado. As mensagens automáticas vão sair por aqui, uma por vez.",
      1200,
    );
    return { ok: true };
  } catch (e) {
    console.error("[whatsapp] teste:", e);
    return { ok: false, error: "O teste não saiu. Confira se o WhatsApp continua conectado no celular." };
  }
}
