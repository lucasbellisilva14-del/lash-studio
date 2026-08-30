import { requireProfessional } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/constants";
import { PageHeader } from "@/components/ui/page-header";
import { TaxasForm } from "./taxas-form";

export const metadata = { title: "Taxas da maquininha" };

export default async function TaxasPage() {
  const professional = await requireProfessional();

  const saved = await prisma.paymentMethodFee.findMany({
    where: { professionalId: professional.id },
  });

  const fees = {} as Record<PaymentMethod, number>;
  for (const method of Object.keys(PAYMENT_METHODS) as PaymentMethod[]) {
    fees[method] = saved.find((f) => f.method === method)?.feePct ?? 0;
  }

  return (
    <div>
      <PageHeader
        title="Taxas"
        subtitle="O que a maquininha desconta em cada forma"
        backHref="/config"
      />
      <TaxasForm fees={fees} />
    </div>
  );
}
