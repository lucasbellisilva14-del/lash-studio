import { LoginForm } from "./login-form";
import { IconCheckCircle, IconMoney, IconClock } from "@/components/ui/icons";

export const metadata = { title: "Entrar" };

/** Exemplos ilustrativos do que o app faz sozinho (não são dados reais). */
const MOMENTOS = [
  { icon: IconCheckCircle, titulo: "Horário confirmado", texto: "Amanhã, 14:00 · Volume brasileiro" },
  { icon: IconMoney, titulo: "Sinal recebido", texto: "Pix confirmado sozinho no Mercado Pago" },
  { icon: IconClock, titulo: "Hora da manutenção", texto: "Mensagem pronta na fila do dia" },
];

function MarcaLashOS({ grande }: { grande?: boolean }) {
  return (
    <div
      className={
        grande
          ? "flex h-14 w-14 items-center justify-center rounded-[18px] bg-white/12"
          : "mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-[18px] bg-accent shadow-[var(--shadow-pop)]"
      }
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinecap="round"
        className="h-8 w-8"
        aria-hidden
      >
        <path d="M4 9c2.5 3.5 13.5 3.5 16 0" />
        <path d="M6 11.2 4.8 13M9.2 12.4l-.7 2M12 12.8v2.1M14.8 12.4l.7 2M18 11.2l1.2 1.8" />
      </svg>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Painel da marca — só no PC */}
      <aside className="relative hidden overflow-hidden bg-accent p-12 text-accent-ink lg:m-3 lg:flex lg:flex-col lg:justify-between lg:rounded-[28px] xl:p-16">
        <div>
          <MarcaLashOS grande />
          <h1 className="mt-10 max-w-md text-[44px] font-bold leading-[1.05] tracking-[-0.04em] xl:text-[52px]">
            Seu estúdio inteiro, num app só.
          </h1>
          <p className="mt-4 max-w-md text-[16px] leading-relaxed text-white/70">
            Agenda, clientes, ficha técnica, WhatsApp e financeiro, pensados para o ciclo dos cílios.
          </p>
        </div>

        <ul className="max-w-sm space-y-3" aria-label="Exemplos do que o LashOS faz">
          {MOMENTOS.map(({ icon: Icon, titulo, texto }, i) => (
            <li
              key={titulo}
              className="flex items-center gap-3.5 rounded-[18px] bg-white px-4 py-3.5 text-ink shadow-[var(--shadow-pop)]"
              style={{ marginLeft: i * 28 }}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink">
                <Icon width={18} height={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold">{titulo}</span>
                <span className="block truncate text-[12.5px] text-ink-soft">{texto}</span>
              </span>
            </li>
          ))}
        </ul>

        <p className="text-[12.5px] text-white/50">Feito para lash designers brasileiras 💗</p>
      </aside>

      {/* Formulário */}
      <div className="flex min-h-dvh flex-col justify-center px-6 py-10 lg:min-h-0">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-9 text-center lg:text-left">
            <div className="lg:hidden">
              <MarcaLashOS />
            </div>
            <h2 className="text-[30px] font-bold leading-[1.1] tracking-[-0.035em] text-ink">
              Bem-vinda de volta
            </h2>
            <p className="mt-2 text-[15px] text-ink-soft">Entre para abrir o seu estúdio.</p>
          </div>
          <LoginForm />
          <p className="mt-10 text-center text-[12.5px] text-ink-faint lg:hidden">
            Feito para lash designers brasileiras 💗
          </p>
        </div>
      </div>
    </div>
  );
}
