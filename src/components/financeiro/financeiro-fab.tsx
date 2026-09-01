"use client";

/** Fab "Nova despesa" + Sheet de lançamento. */
import { useState } from "react";
import { Fab } from "@/components/ui/fab";
import { ExpenseSheet } from "./expense-sheet";

export function FinanceiroFab({ todayKey }: { todayKey: string }) {
  const [open, setOpen] = useState(false);

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
