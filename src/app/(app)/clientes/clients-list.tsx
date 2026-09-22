"use client";

/**
 * Lista de clientes com busca instantânea (nome/telefone) + Fab "Nova cliente".
 * Gestos: deslizar pra direita abre o WhatsApp; pra esquerda, agenda.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ClientStatus } from "@/lib/constants";
import { formatPhone, waLink } from "@/lib/phone";
import { Card } from "@/components/ui/card";
import { ClientStatusBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { Fab } from "@/components/ui/fab";
import { Button } from "@/components/ui/button";
import { SwipeRow } from "@/components/ui/swipe-row";
import {
  IconCalendar,
  IconChevronRight,
  IconSearch,
  IconUsers,
  IconWhatsApp,
} from "@/components/ui/icons";
import { ClientAvatar } from "@/components/clientes/client-avatar";
import { ClientFormSheet } from "@/components/clientes/client-form-sheet";

export type ClientRow = {
  id: string;
  name: string;
  phone: string;
  status: ClientStatus;
  hasContraindication: boolean;
};

/** minúsculas + sem acentos, p/ busca tolerante. */
function searchable(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function ClientsList({
  clients,
  novaInicial = false,
}: {
  clients: ClientRow[];
  novaInicial?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sheetOpen, setSheetOpen] = useState(novaInicial);

  const filtered = useMemo(() => {
    const q = searchable(query.trim());
    const qDigits = query.replace(/\D/g, "");
    if (!q) return clients;
    return clients.filter(
      (c) =>
        searchable(c.name).includes(q) ||
        (qDigits.length > 0 && c.phone.includes(qDigits)),
    );
  }, [clients, query]);

  return (
    <div className="space-y-3">
      {clients.length > 0 ? (
        <div className="relative">
          <IconSearch
            width={17}
            height={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            aria-label="Buscar cliente"
            className="pl-10"
          />
        </div>
      ) : null}

      {clients.length === 0 ? (
        <Card>
          <EmptyState
            icon={<IconUsers />}
            title="Nenhuma cliente ainda"
            description="Cadastre sua primeira cliente para acompanhar ciclo, anamnese e histórico."
            action={<Button onClick={() => setSheetOpen(true)}>Nova cliente</Button>}
          />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<IconSearch />}
            title="Nenhuma cliente encontrada"
            description="Confira a grafia ou tente buscar pelo telefone."
          />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {filtered.map((client) => (
              <li key={client.id}>
                <SwipeRow
                  leftAction={{
                    label: "WhatsApp",
                    icon: <IconWhatsApp width={18} height={18} />,
                    className: "bg-success",
                    onTrigger: () =>
                      window.open(waLink(client.phone), "_blank", "noopener"),
                  }}
                  rightAction={{
                    label: "Agendar",
                    icon: <IconCalendar width={18} height={18} />,
                    className: "bg-accent",
                    onTrigger: () =>
                      router.push(`/agenda?novo=1&cliente=${client.id}`),
                  }}
                >
                <Link
                  href={`/clientes/${client.id}`}
                  className="flex items-center gap-3 px-4 py-3 active:bg-surface-sunken transition-colors"
                >
                  <ClientAvatar name={client.name} />
                  <div className="min-w-0 grow">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="font-medium text-ink truncate">{client.name}</p>
                      {client.hasContraindication ? (
                        <span
                          className="w-2 h-2 rounded-full bg-danger shrink-0"
                          title="Contraindicação na anamnese"
                          aria-label="Contraindicação na anamnese"
                        />
                      ) : null}
                    </div>
                    <p className="text-[13px] text-ink-faint mt-0.5">
                      {formatPhone(client.phone)}
                    </p>
                  </div>
                  <ClientStatusBadge status={client.status} />
                  <IconChevronRight
                    width={16}
                    height={16}
                    className="text-ink-faint shrink-0"
                  />
                </Link>
                </SwipeRow>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Fab label="Nova cliente" onClick={() => setSheetOpen(true)} />
      {sheetOpen ? (
        <ClientFormSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
      ) : null}
    </div>
  );
}
