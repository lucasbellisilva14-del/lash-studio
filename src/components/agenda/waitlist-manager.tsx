"use client";

/** Lista de espera: adicionar em Sheet, listar ATIVAS e resolver (atendida/cancelada). */
import { useActionState, useEffect, useState, useTransition } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { IconCheck, IconClock, IconPlus, IconWhatsApp, IconX } from "@/components/ui/icons";
import { formatPhone, waLink } from "@/lib/phone";
import {
  criarEsperaAction,
  mudarStatusEspera,
  type EsperaFormState,
} from "@/app/(app)/agenda/espera/actions";

export type EsperaItem = {
  id: string;
  clienteNome: string;
  clienteTelefone: string;
  servicoNome: string | null;
  periodo: string | null;
  nota: string | null;
  criadaEm: string;
};

const estadoInicial: EsperaFormState = {};

export function WaitlistManager({
  itens,
  clientes,
  servicos,
}: {
  itens: EsperaItem[];
  clientes: Array<{ id: string; name: string }>;
  servicos: Array<{ id: string; name: string }>;
}) {
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pendente] = useActionState(criarEsperaAction, estadoInicial);

  useEffect(() => {
    if (state.ok) setAberto(false);
  }, [state]);

  return (
    <div className="space-y-5">
      <Button size="lg" onClick={() => setAberto(true)}>
        <IconPlus width={18} height={18} />
        Adicionar à lista
      </Button>

      {itens.length === 0 ? (
        <EmptyState
          icon={<IconClock />}
          title="Lista de espera vazia"
          description="Quando um horário vagar, o LashOS avisa quem está esperando pelo período."
        />
      ) : (
        <ul className="space-y-2.5">
          {itens.map((item) => (
            <li key={item.id} className="bg-surface border border-line rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-[15px] text-ink truncate">
                    {item.clienteNome}
                  </p>
                  <p className="text-xs text-ink-soft mt-0.5">
                    {formatPhone(item.clienteTelefone)}
                    {item.servicoNome ? ` · ${item.servicoNome}` : ""}
                  </p>
                  {item.periodo ? (
                    <p className="text-xs text-ink-soft mt-0.5">Período: {item.periodo}</p>
                  ) : null}
                  {item.nota ? (
                    <p className="text-xs text-ink-faint mt-0.5">“{item.nota}”</p>
                  ) : null}
                  <p className="text-[11px] text-ink-faint mt-1">
                    Na lista desde {item.criadaEm}
                  </p>
                </div>
                <a
                  href={waLink(item.clienteTelefone)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Chamar ${item.clienteNome} no WhatsApp`}
                  className="shrink-0 p-2 rounded-full bg-success-soft text-success"
                >
                  <IconWhatsApp width={18} height={18} />
                </a>
              </div>
              <BotoesResolver id={item.id} />
            </li>
          ))}
        </ul>
      )}

      <Sheet open={aberto} onClose={() => setAberto(false)} title="Adicionar à lista de espera" tall>
        <form action={formAction} className="space-y-4 pt-1">
          <Field label="Cliente" htmlFor="esp-cliente">
            <Select id="esp-cliente" name="clienteId" required defaultValue="">
              <option value="" disabled>
                Escolha a cliente
              </option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Serviço (opcional)" htmlFor="esp-servico">
            <Select id="esp-servico" name="servicoId" defaultValue="">
              <option value="">Qualquer serviço</option>
              {servicos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="A partir de" htmlFor="esp-de">
              <Input id="esp-de" name="dataDe" type="date" />
            </Field>
            <Field label="Até" htmlFor="esp-ate">
              <Input id="esp-ate" name="dataAte" type="date" />
            </Field>
          </div>
          <Field
            label="Observação do período (opcional)"
            htmlFor="esp-nota"
            hint='Ex.: "qualquer manhã", "sábado à tarde"'
          >
            <Input id="esp-nota" name="nota" placeholder="Preferência de horário" />
          </Field>

          {state.erro ? (
            <p className="text-sm text-danger bg-danger-soft rounded-xl px-3.5 py-2.5">
              {state.erro}
            </p>
          ) : null}

          <Button type="submit" size="lg" disabled={pendente}>
            {pendente ? "Salvando..." : "Adicionar à lista"}
          </Button>
        </form>
      </Sheet>
    </div>
  );
}

function BotoesResolver({ id }: { id: string }) {
  const [pendente, startAcao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function resolver(status: "ATENDIDA" | "CANCELADA") {
    setErro(null);
    startAcao(async () => {
      const res = await mudarStatusEspera(id, status);
      if (!res.ok) setErro(res.erro);
    });
  }

  return (
    <div className="mt-3">
      {erro ? <p className="text-xs text-danger mb-2">{erro}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={pendente}
          onClick={() => resolver("ATENDIDA")}
          className="w-full text-success"
        >
          <IconCheck width={15} height={15} />
          Atendida
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pendente}
          onClick={() => resolver("CANCELADA")}
          className="w-full border border-line"
        >
          <IconX width={15} height={15} />
          Cancelar
        </Button>
      </div>
    </div>
  );
}
