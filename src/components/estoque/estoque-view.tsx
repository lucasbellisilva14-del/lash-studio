"use client";

/**
 * Tela do Estoque: alertas no topo (mínimo, colas vencendo, validade),
 * lista por categoria com botões rápidos de entrada/baixa e CRUD via Sheet.
 * Inativos ficam numa seção recolhida com ação de reativar.
 */
import { useActionState, useState, type SVGProps } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Fab } from "@/components/ui/fab";
import {
  IconAlert,
  IconBox,
  IconChevronDown,
  IconChevronRight,
  IconClock,
  IconPlus,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { PRODUCT_CATEGORIES } from "@/lib/constants";
import {
  reactivateProductAction,
  type EstoqueActionState,
} from "@/app/(app)/estoque/actions";
import { IconDroplet, IconMinus } from "@/components/estoque/icons";
import { MovementSheet, type MovementKind } from "@/components/estoque/movement-sheet";
import { ProductFormSheet } from "@/components/estoque/product-form-sheet";
import { formatQty, type ProductCategory, type ProductItem } from "@/components/estoque/types";

const initialState: EstoqueActionState = { ok: false, error: null };

/** Validade impressa: alerta quando faltam até 30 dias. */
const EXPIRY_ALERT_DAYS = 30;
/** Cola aberta: alerta quando faltam até 7 dias. */
const GLUE_ALERT_DAYS = 7;

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

type AlertIcon = "droplet" | "box" | "alert";

type EstoqueAlert = {
  key: string;
  tone: "danger" | "warning";
  icon: AlertIcon;
  title: string;
  description: string;
  product: ProductItem;
};

const alertIcons: Record<AlertIcon, (p: SVGProps<SVGSVGElement>) => React.JSX.Element> = {
  droplet: IconDroplet,
  box: IconBox,
  alert: IconAlert,
};

const alertChip: Record<"danger" | "warning", string> = {
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
};

function buildAlerts(actives: ProductItem[]): EstoqueAlert[] {
  const alerts: EstoqueAlert[] = [];

  // 1. Colas abertas vencendo (≤ 7 dias) ou vencidas
  for (const p of actives) {
    if (p.glueDaysLeft == null || p.glueDaysLeft > GLUE_ALERT_DAYS) continue;
    const when =
      p.glueDaysLeft < 0
        ? "venceu"
        : p.glueDaysLeft === 0
          ? "vence hoje"
          : `vence em ${p.glueDaysLeft} ${plural(p.glueDaysLeft, "dia", "dias")}`;
    alerts.push({
      key: `cola:${p.id}`,
      tone: p.glueDaysLeft <= 0 ? "danger" : "warning",
      icon: "droplet",
      title: p.name,
      description: `Aberta em ${p.openedAtLabel} — ${when}`,
      product: p,
    });
  }

  // 2. Produtos abaixo do mínimo
  for (const p of actives) {
    if (!p.lowStock) continue;
    alerts.push({
      key: `minimo:${p.id}`,
      tone: p.quantity <= 0 ? "danger" : "warning",
      icon: "box",
      title: `${p.name} abaixo do mínimo`,
      description: `${formatQty(p.quantity)} ${p.unit} em estoque — mínimo ${formatQty(p.minQuantity)}`,
      product: p,
    });
  }

  // 3. Validade impressa na embalagem se aproximando
  for (const p of actives) {
    if (p.expiresDaysLeft == null || p.expiresDaysLeft > EXPIRY_ALERT_DAYS) continue;
    const when =
      p.expiresDaysLeft < 0
        ? "vencido"
        : p.expiresDaysLeft === 0
          ? "vence hoje"
          : `vence em ${p.expiresDaysLeft} ${plural(p.expiresDaysLeft, "dia", "dias")}`;
    alerts.push({
      key: `validade:${p.id}`,
      tone: p.expiresDaysLeft <= 0 ? "danger" : "warning",
      icon: "alert",
      title: p.name,
      description: `Validade ${p.expiresAtLabel} — ${when}`,
      product: p,
    });
  }

  // Vencidos/zerados (danger) primeiro; sort estável preserva a ordem acima.
  return alerts.sort((a, b) =>
    a.tone === b.tone ? 0 : a.tone === "danger" ? -1 : 1,
  );
}

export function EstoqueView({ products }: { products: ProductItem[] }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductItem | null>(null);
  const [movement, setMovement] = useState<{
    product: ProductItem;
    kind: MovementKind;
  } | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const actives = products.filter((p) => p.active);
  const inactives = products.filter((p) => !p.active);
  const alerts = buildAlerts(actives);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (product: ProductItem) => {
    setEditing(product);
    setFormOpen(true);
  };
  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  return (
    <>
      {products.length === 0 ? (
        <EmptyState
          icon={<IconBox />}
          title="Nenhum insumo cadastrado"
          description="Cadastre fios, colas e materiais para acompanhar o estoque e receber alertas."
          action={<Button onClick={openNew}>Novo insumo</Button>}
        />
      ) : (
        <>
          {alerts.length > 0 ? (
            <section className="mb-5">
              <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-ink-faint">
                Alertas
              </h2>
              <Card className="divide-y divide-line overflow-hidden">
                {alerts.map((alert) => {
                  const Icon = alertIcons[alert.icon];
                  return (
                    <button
                      key={alert.key}
                      type="button"
                      onClick={() => openEdit(alert.product)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-surface-sunken"
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                          alertChip[alert.tone],
                        )}
                      >
                        <Icon width={18} height={18} />
                      </span>
                      <span className="min-w-0 grow">
                        <span className="block truncate text-sm font-medium text-ink">
                          {alert.title}
                        </span>
                        <span className="block truncate text-[13px] text-ink-soft">
                          {alert.description}
                        </span>
                      </span>
                      <IconChevronRight
                        width={16}
                        height={16}
                        className="shrink-0 text-ink-faint"
                      />
                    </button>
                  );
                })}
              </Card>
            </section>
          ) : null}

          {(Object.keys(PRODUCT_CATEGORIES) as ProductCategory[]).map((key) => {
            const items = actives.filter((p) => p.category === key);
            if (items.length === 0) return null;
            return (
              <section key={key} className="mb-5">
                <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-ink-faint">
                  {PRODUCT_CATEGORIES[key]}
                </h2>
                <Card>
                  <ul className="divide-y divide-line">
                    {items.map((product) => (
                      <ProductRow
                        key={product.id}
                        product={product}
                        onEdit={() => openEdit(product)}
                        onMovement={(kind) => setMovement({ product, kind })}
                      />
                    ))}
                  </ul>
                </Card>
              </section>
            );
          })}

          {actives.length === 0 ? (
            <EmptyState
              icon={<IconBox />}
              title="Nenhum insumo ativo"
              description="Reative um insumo desativado ou cadastre um novo."
              action={<Button onClick={openNew}>Novo insumo</Button>}
            />
          ) : null}

          {inactives.length > 0 ? (
            <section className="mb-5">
              <button
                type="button"
                onClick={() => setShowInactive((v) => !v)}
                aria-expanded={showInactive}
                className="flex w-full items-center justify-between rounded-lg px-1 py-2 text-left"
              >
                <span className="text-[13px] font-semibold uppercase tracking-wide text-ink-faint">
                  Desativados ({inactives.length})
                </span>
                <IconChevronDown
                  width={16}
                  height={16}
                  className={cn(
                    "text-ink-faint transition-transform",
                    showInactive && "rotate-180",
                  )}
                />
              </button>
              {showInactive ? (
                <Card>
                  <ul className="divide-y divide-line">
                    {inactives.map((product) => (
                      <InactiveRow key={product.id} product={product} />
                    ))}
                  </ul>
                </Card>
              ) : null}
            </section>
          ) : null}
        </>
      )}

      <Fab label="Novo insumo" onClick={openNew} />

      {formOpen ? (
        <ProductFormSheet
          key={editing?.id ?? "novo"}
          product={editing}
          onClose={closeForm}
        />
      ) : null}

      {movement ? (
        <MovementSheet
          key={`${movement.product.id}:${movement.kind}`}
          product={movement.product}
          kind={movement.kind}
          onClose={() => setMovement(null)}
        />
      ) : null}
    </>
  );
}

function GlueBadge({ product }: { product: ProductItem }) {
  if (product.category !== "COLA") return null;
  if (product.glueDaysLeft == null || !product.openedAtLabel) {
    return <Badge tone="neutral">Fechada</Badge>;
  }
  const d = product.glueDaysLeft;
  if (d < 0) return <Badge tone="danger">Venceu — aberta em {product.openedAtLabel}</Badge>;
  if (d === 0) return <Badge tone="danger">Vence hoje</Badge>;
  if (d <= GLUE_ALERT_DAYS) {
    return (
      <Badge tone="warning">
        Vence em {d} {plural(d, "dia", "dias")}
      </Badge>
    );
  }
  return <Badge tone="neutral">Aberta em {product.openedAtLabel}</Badge>;
}

function ProductRow({
  product,
  onEdit,
  onMovement,
}: {
  product: ProductItem;
  onEdit: () => void;
  onMovement: (kind: MovementKind) => void;
}) {
  const showExpiryBadge =
    product.category !== "COLA" &&
    product.expiresDaysLeft != null &&
    product.expiresDaysLeft <= EXPIRY_ALERT_DAYS;

  return (
    <li className="flex items-center gap-1.5 pr-3">
      <button
        type="button"
        onClick={onEdit}
        className="min-w-0 grow px-4 py-3.5 text-left transition-colors active:bg-surface-sunken"
      >
        <span className="block truncate font-medium text-ink">{product.name}</span>
        {product.specLabel ? (
          <span className="mt-0.5 block truncate text-xs text-ink-faint">
            {product.specLabel}
          </span>
        ) : null}
        <span className="mt-0.5 block text-sm">
          <span
            className={cn(
              "font-medium",
              product.lowStock ? "text-danger" : "text-ink-soft",
            )}
          >
            {formatQty(product.quantity)} {product.unit}
          </span>
          {product.minQuantity > 0 ? (
            <span className="text-ink-faint"> · mín. {formatQty(product.minQuantity)}</span>
          ) : null}
        </span>
        {product.category === "COLA" || showExpiryBadge ? (
          <span className="mt-1.5 flex flex-wrap gap-1">
            <GlueBadge product={product} />
            {showExpiryBadge ? (
              <Badge tone={product.expiresDaysLeft! <= 0 ? "danger" : "warning"}>
                Validade {product.expiresAtLabel}
              </Badge>
            ) : null}
          </span>
        ) : null}
      </button>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          aria-label={`Registrar entrada de ${product.name}`}
          onClick={() => onMovement("ENTRADA")}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-success transition-colors active:bg-surface-sunken"
        >
          <IconPlus width={18} height={18} />
        </button>
        <button
          type="button"
          aria-label={`Registrar baixa de ${product.name}`}
          onClick={() => onMovement("BAIXA")}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-danger transition-colors active:bg-surface-sunken"
        >
          <IconMinus width={18} height={18} />
        </button>
      </div>
    </li>
  );
}

function InactiveRow({ product }: { product: ProductItem }) {
  const [state, formAction, pending] = useActionState(
    reactivateProductAction,
    initialState,
  );

  return (
    <li className="flex items-center gap-3 px-4 py-3.5">
      <div className="min-w-0 grow">
        <p className="truncate font-medium text-ink-soft">{product.name}</p>
        <p className="mt-0.5 text-sm text-ink-faint">
          {PRODUCT_CATEGORIES[product.category]} · {formatQty(product.quantity)}{" "}
          {product.unit}
        </p>
        {state.error ? <p className="mt-1 text-xs text-danger">{state.error}</p> : null}
      </div>
      <form action={formAction} className="shrink-0">
        <input type="hidden" name="id" value={product.id} />
        <Button size="sm" variant="secondary" disabled={pending}>
          {pending ? "Reativando..." : "Reativar"}
        </Button>
      </form>
    </li>
  );
}
