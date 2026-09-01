import "server-only";
import { prisma } from "@/lib/prisma";

/** Evita resíduos de ponto flutuante (0.1 * 3...) nas quantidades. */
function roundQty(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Baixa automática de estoque disparada ao registrar o recebimento de um
 * atendimento: para cada insumo ativo com consumo médio configurado
 * (usagePerService > 0), decrementa a quantidade — nunca abaixo de zero —
 * e registra a movimentação BAIXA, tudo numa única transação.
 */
export async function consumirEstoqueDoAtendimento(professionalId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where: { professionalId, active: true, usagePerService: { gt: 0 } },
      select: { id: true, quantity: true, usagePerService: true },
    });

    for (const product of products) {
      const newQuantity = Math.max(0, roundQty(product.quantity - product.usagePerService));
      await tx.product.update({
        where: { id: product.id },
        data: { quantity: newQuantity },
      });
      await tx.stockMovement.create({
        data: {
          professionalId,
          productId: product.id,
          type: "BAIXA",
          quantity: product.usagePerService,
          reason: "Consumo automático — atendimento",
        },
      });
    }
  });
}
