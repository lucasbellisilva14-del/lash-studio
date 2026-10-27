"use client";

/**
 * Ações do cabeçalho do Financeiro (só a dona): "Meta do mês" e "+ Despesa".
 * No celular a meta vira só o ícone, para o título respirar. `abrirDespesa`
 * (vindo de ?despesa=1, atalho da home e da calculadora) já abre o lançamento.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@/components/ui/icons";
import { ExpenseSheet } from "./expense-sheet";
import { GoalSheet } from "./goal-card";
import { IconTarget } from "./icons";

export function HeaderActions({
  monthKey,
  monthLabel,
  goalTargetCents,
  todayKey,
  abrirDespesa,
}: {
  monthKey: string;
  monthLabel: string;
  goalTargetCents: number | null;
  todayKey: string;
  abrirDespesa: boolean;
}) {
  const [despesaAberta, setDespesaAberta] = useState(abrirDespesa);
  const [metaAberta, setMetaAberta] = useState(false);

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        aria-label="Meta do mês"
        onClick={() => setMetaAberta(true)}
      >
        <IconTarget width={16} height={16} />
        <span className="hidden sm:inline">Meta do mês</span>
      </Button>
      <Button variant="danger-soft" size="sm" onClick={() => setDespesaAberta(true)}>
        <IconPlus width={16} height={16} />
        Despesa
      </Button>

      {metaAberta ? (
        <GoalSheet
          monthKey={monthKey}
          monthLabel={monthLabel}
          targetCents={goalTargetCents}
          onClose={() => setMetaAberta(false)}
        />
      ) : null}
      {despesaAberta ? (
        <ExpenseSheet
          expense={null}
          defaultDateKey={todayKey}
          onClose={() => setDespesaAberta(false)}
        />
      ) : null}
    </>
  );
}
