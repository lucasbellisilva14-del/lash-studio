"use client";

/**
 * Lançamentos do mês (mais recentes primeiro).
 * Despesa: toque abre o Sheet de edição. Receita de sinal/atendimento:
 * somente leitura — toque leva à ficha do atendimento quando houver.
 */
import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { IconChevronRight, IconMoney } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";
import { formatBRL } from "@/lib/money";
import { ExpenseSheet } from "./expense-sheet";
import { IconRepeat } from "./icons";
import type { ExpenseDraft, LancamentoItem } from "./types";

function kindBadge(item: LancamentoItem) {
  if (item.type === "DESPESA") {
    return (
      <Badge tone="danger">
        {item.category ? EXPENSE_CATEGORIES[item.category] : "Despesa"}
      </Badge>
    );
  }
  if (item.kind === "SINAL") return <Badge tone="accent">Sinal</Badge>;
  if (item.kind === "ATENDIMENTO") return <Badge tone="success">Atendimento</Badge>;
  return <Badge tone="neutral">Receita</Badge>;
}

function RowContent({ item, withChevron }: { item: LancamentoItem; withChevron?: boolean }) {
  const isReceita = item.type === "RECEITA";
  const methodLabel = item.method
    ? (PAYMENT_METHODS[item.method as keyof typeof PAYMENT_METHODS] ?? null)
    : null;

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 grow">
        <div className="flex flex-wrap items-center gap-1.5">
          {kindBadge(item)}
          {item.recurrence === "FIXA_MENSAL" ? (
            <Badge tone="neutral">
              <IconRepeat width={11} height={11} />
              Fixa mensal
            </Badge>
          ) : null}
        </div>
        <p className="mt-1 truncate text-[15px] font-medium text-ink">
          {item.description}
        </p>
        <p className="mt-0.5 text-xs text-ink-faint">
          {item.dateLabel}
          {methodLabel ? ` · ${methodLabel}` : ""}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p
          className={cn(
            "text-[15px] font-semibold",
            isReceita ? "text-success" : "text-danger",
          )}
        >
          {isReceita ? formatBRL(item.amountCents) : `− ${formatBRL(item.amountCents)}`}
        </p>
        {item.netCents !== item.amountCents ? (
          <p className="mt-0.5 text-[11px] text-ink-faint">
            líquido {formatBRL(item.netCents)}
          </p>
        ) : null}
      </div>

      {withChevron ? (
        <IconChevronRight width={16} height={16} className="shrink-0 text-ink-faint" />
      ) : null}
    </div>
  );
}

export function LancamentosList({
  items,
  todayKey,
}: {
  items: LancamentoItem[];
  /** "yyyy-MM-dd" de hoje (data padrão ao editar/criar despesa). */
  todayKey: string;
}) {
  const [editing, setEditing] = useState<ExpenseDraft | null>(null);

  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<IconMoney />}
          title="Nenhum lançamento neste mês"
          description="Receitas entram sozinhas pela agenda e pela ficha do atendimento. Despesas você lança no botão abaixo."
        />
      </Card>
    );
  }

  return (
    <>
      <Card>
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li key={item.id}>
              {item.type === "DESPESA" ? (
                <button
                  type="button"
                  onClick={() =>
                    setEditing({
                      id: item.id,
                      description: item.description,
                      category: item.category ?? "OUTROS",
                      amountCents: item.amountCents,
                      dateKey: item.dateKey,
                      recurrence: item.recurrence,
                    })
                  }
                  className="w-full text-left transition-colors active:bg-surface-sunken"
                >
                  <RowContent item={item} />
                </button>
              ) : item.appointmentId ? (
                <Link
                  href={`/atendimentos/${item.appointmentId}`}
                  className="block transition-colors active:bg-surface-sunken"
                >
                  <RowContent item={item} withChevron />
                </Link>
              ) : (
                <RowContent item={item} />
              )}
            </li>
          ))}
        </ul>
      </Card>

      {editing ? (
        <ExpenseSheet
          expense={editing}
          defaultDateKey={todayKey}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}
