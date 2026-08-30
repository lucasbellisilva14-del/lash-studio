"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProfessionalId } from "@/lib/session";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/constants";
import { type ConfigFormState, fieldErrorsFrom } from "../form-state";
import { pctField } from "../validation";

const METHODS = Object.keys(PAYMENT_METHODS) as PaymentMethod[];

const schema = z.object(
  Object.fromEntries(
    METHODS.map((method) => [
      `fee-${method}`,
      pctField("Informe uma taxa de 0 a 100%."),
    ]),
  ),
);

export async function salvarTaxasAction(
  _prev: ConfigFormState,
  formData: FormData,
): Promise<ConfigFormState> {
  const professionalId = await requireProfessionalId();

  const parsed = schema.safeParse(
    Object.fromEntries(
      METHODS.map((method) => {
        const raw = String(formData.get(`fee-${method}`) ?? "").trim();
        return [`fee-${method}`, raw === "" ? "0" : raw];
      }),
    ),
  );

  if (!parsed.success) {
    return {
      ok: false,
      error: "Revise os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const fees = METHODS.map((method) => ({
    method,
    feePct: parsed.data[`fee-${method}`] as number,
  }));

  try {
    await prisma.$transaction(
      fees.map((fee) =>
        prisma.paymentMethodFee.upsert({
          where: {
            professionalId_method: { professionalId, method: fee.method },
          },
          create: { professionalId, method: fee.method, feePct: fee.feePct },
          update: { feePct: fee.feePct },
        }),
      ),
    );
  } catch {
    return { ok: false, error: "Não foi possível salvar. Tente novamente." };
  }

  // Taxas entram no cálculo do líquido nos pagamentos e no financeiro.
  revalidatePath("/", "layout");
  return { ok: true, savedAt: Date.now() };
}
