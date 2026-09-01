import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireProfessional } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { PRODUCT_CATEGORIES } from "@/lib/constants";
import { diffLocalDays, formatDate, formatWithPattern, localDayKey } from "@/lib/dates";
import { EstoqueView } from "@/components/estoque/estoque-view";
import {
  specLabel,
  type MovementItem,
  type ProductCategory,
  type ProductItem,
  type ProductSpec,
} from "@/components/estoque/types";

export const metadata = { title: "Estoque" };

function parseSpec(json: string | null): ProductSpec | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const pick = (key: string): string | null =>
      typeof parsed[key] === "string" && parsed[key] ? String(parsed[key]) : null;
    const spec = {
      curvatura: pick("curvatura"),
      espessura: pick("espessura"),
      tamanho: pick("tamanho"),
    };
    return spec.curvatura || spec.espessura || spec.tamanho ? spec : null;
  } catch {
    return null;
  }
}

export default async function EstoquePage() {
  const professional = await requireProfessional();
  const professionalId = professional.id;
  const tz = professional.timezone;
  const now = new Date();

  const products = await prisma.product.findMany({
    where: { professionalId },
    orderBy: { name: "asc" },
    include: { movements: { orderBy: { createdAt: "desc" }, take: 8 } },
  });

  const items: ProductItem[] = products.map((p) => {
    const category = (
      p.category in PRODUCT_CATEGORIES ? p.category : "OUTRO"
    ) as ProductCategory;
    const spec = parseSpec(p.specJson);

    let glueDaysLeft: number | null = null;
    if (p.openedAt && p.shelfLifeDaysAfterOpen != null) {
      glueDaysLeft = diffLocalDays(
        now,
        addDays(p.openedAt, p.shelfLifeDaysAfterOpen),
        tz,
      );
    }

    const movements: MovementItem[] = p.movements.map((m) => ({
      id: m.id,
      type: (m.type === "ENTRADA" || m.type === "AJUSTE" ? m.type : "BAIXA") as
        | "ENTRADA"
        | "BAIXA"
        | "AJUSTE",
      quantity: m.quantity,
      reason: m.reason,
      dateLabel: formatWithPattern(m.createdAt, "dd/MM 'às' HH:mm", tz),
    }));

    return {
      id: p.id,
      name: p.name,
      category,
      spec,
      specLabel: specLabel(spec),
      unit: p.unit,
      quantity: p.quantity,
      minQuantity: p.minQuantity,
      costCents: p.costCents,
      usagePerService: p.usagePerService,
      active: p.active,
      lowStock: p.quantity <= p.minQuantity,
      openedAtKey: p.openedAt ? localDayKey(p.openedAt, tz) : null,
      openedAtLabel: p.openedAt ? formatWithPattern(p.openedAt, "dd/MM", tz) : null,
      shelfLifeDaysAfterOpen: p.shelfLifeDaysAfterOpen,
      glueDaysLeft,
      expiresAtKey: p.expiresAt ? localDayKey(p.expiresAt, tz) : null,
      expiresAtLabel: p.expiresAt ? formatDate(p.expiresAt, tz) : null,
      expiresDaysLeft: p.expiresAt ? diffLocalDays(now, p.expiresAt, tz) : null,
      movements,
    };
  });

  const activeCount = items.filter((i) => i.active).length;

  return (
    <>
      <PageHeader
        title="Estoque"
        subtitle={activeCount === 1 ? "1 insumo ativo" : `${activeCount} insumos ativos`}
      />
      <EstoqueView products={items} />
    </>
  );
}
