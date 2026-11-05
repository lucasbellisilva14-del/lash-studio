import "server-only";

/** Estado da conexão do estúdio no banco, alinhado com o servidor de WhatsApp. */
import { prisma } from "@/lib/prisma";
import { estadoDaConexao, perfilConectado } from "@/lib/whatsapp/evolution";

/** Primeira mensagem automática só um pouco depois de conectar (ritmo natural). */
const AQUECIMENTO_MS = 90_000;

/** O servidor diz "open": grava como conectado (número e nome do perfil). */
export async function marcarConectado(professionalId: string, instanceName: string) {
  const perfil = await perfilConectado(instanceName).catch(() => ({ phone: null, profileName: null }));
  const agora = new Date();
  const atual = await prisma.whatsAppConnection.findUnique({
    where: { professionalId },
    select: { status: true },
  });
  const jaEstava = atual?.status === "CONECTADO";
  return prisma.whatsAppConnection.upsert({
    where: { professionalId },
    create: {
      professionalId,
      instanceName,
      status: "CONECTADO",
      phone: perfil.phone,
      profileName: perfil.profileName,
      connectedAt: agora,
      nextSendAt: new Date(agora.getTime() + AQUECIMENTO_MS),
    },
    update: {
      instanceName,
      status: "CONECTADO",
      ...(perfil.phone ? { phone: perfil.phone } : {}),
      ...(perfil.profileName ? { profileName: perfil.profileName } : {}),
      ...(jaEstava ? {} : { connectedAt: agora, nextSendAt: new Date(agora.getTime() + AQUECIMENTO_MS) }),
      closedSince: null,
      dropNotifiedAt: null,
      lastError: null,
    },
  });
}

/**
 * Confere ao vivo ao abrir a tela: conectou (ou voltou) → CONECTADO;
 * tentativa abandonada → DESCONECTADO. Devolve se a conexão gravada como
 * CONECTADO não está aberta agora (instável).
 */
export async function sincronizarConexao(professionalId: string) {
  const conexao = await prisma.whatsAppConnection.findUnique({ where: { professionalId } });
  if (!conexao || conexao.status === "DESCONECTADO") return { conexao, instavel: false };
  const estado = await estadoDaConexao(conexao.instanceName).catch(() => "desconhecido" as const);
  if (estado === "open") {
    return { conexao: await marcarConectado(professionalId, conexao.instanceName), instavel: false };
  }
  if (conexao.status === "CONECTANDO" && estado === "close") {
    const atualizada = await prisma.whatsAppConnection.update({
      where: { professionalId },
      data: { status: "DESCONECTADO" },
    });
    return { conexao: atualizada, instavel: false };
  }
  return { conexao, instavel: conexao.status === "CONECTADO" };
}
