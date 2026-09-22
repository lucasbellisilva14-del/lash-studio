"use client";

/** Fab "Nova despesa" + Sheet de lançamento. Abre direto com ?despesa=1. */
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Fab } from "@/components/ui/fab";
import { ExpenseSheet } from "./expense-sheet";

export function FinanceiroFab({ todayKey }: { todayKey: string }) {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(searchParams.get("despesa") === "1");

  return (
    <>
      <Fab label="Nova despesa" onClick={() => setOpen(true)} />
      {open ? (
        <ExpenseSheet
          expense={null}
          defaultDateKey={todayKey}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
