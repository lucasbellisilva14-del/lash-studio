import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar" };

const DESTAQUES = [
  { emoji: "📅", texto: "Agenda inteligente com regras do ciclo de manutenção" },
  { emoji: "💬", texto: "Fila de WhatsApp pronta: confirmações, lembretes e resgates" },
  { emoji: "💸", texto: "Sinal via Pix copia-e-cola e financeiro completo" },
  { emoji: "🏆", texto: "Conquistas e metas para o estúdio crescer jogando" },
];

function MarcaLashOS({ compacta }: { compacta?: boolean }) {
  return (
    <div className={compacta ? "text-center" : ""}>
      <div
        className={
          compacta
            ? "mx-auto mb-4 h-16 w-16 rounded-3xl bg-accent-gradient shadow-lg shadow-accent/25 flex items-center justify-center"
            : "mb-5 h-20 w-20 rounded-[28px] bg-white/15 backdrop-blur flex items-center justify-center"
        }
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff7fa"
          strokeWidth="1.9"
          strokeLinecap="round"
          className={compacta ? "w-9 h-9" : "w-11 h-11"}
        >
          <path d="M4 9c2.5 3.5 13.5 3.5 16 0" />
          <path d="M6 11.2 4.8 13M9.2 12.4l-.7 2M12 12.8v2.1M14.8 12.4l.7 2M18 11.2l1.2 1.8" />
        </svg>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-2">
      {/* Painel de marca — só no desktop */}
      <aside className="hidden lg:flex flex-col justify-between bg-accent-gradient text-white p-12 xl:p-16">
        <div>
          <MarcaLashOS />
          <h1 className="font-display text-5xl xl:text-6xl font-semibold leading-tight">
            LashOS
          </h1>
          <p className="mt-3 text-lg text-white/85 max-w-md">
            Seu estúdio inteiro — agenda, clientes, WhatsApp e financeiro — em um
            lugar só, lindo de usar.
          </p>
        </div>
        <ul className="space-y-4 max-w-md">
          {DESTAQUES.map((d) => (
            <li key={d.texto} className="flex items-start gap-3.5">
              <span className="text-xl shrink-0" aria-hidden>
                {d.emoji}
              </span>
              <span className="text-[15px] text-white/90 leading-snug">{d.texto}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-white/60">
          Feito para lash designers brasileiras 💗
        </p>
      </aside>

      {/* Formulário */}
      <div className="min-h-dvh lg:min-h-0 flex flex-col justify-center px-6 py-10 bg-background bg-[radial-gradient(80%_50%_at_50%_0%,color-mix(in_srgb,var(--accent)_14%,transparent),transparent)]">
        <div className="mx-auto w-full max-w-sm">
          <div className="text-center mb-10">
            <MarcaLashOS compacta />
            <h2 className="font-display text-3xl font-semibold text-ink">
              <span className="lg:hidden">LashOS</span>
              <span className="hidden lg:inline">Bem-vinda de volta</span>
            </h2>
            <p className="text-sm text-ink-soft mt-1.5">
              <span className="lg:hidden">Seu estúdio inteiro, no seu celular.</span>
              <span className="hidden lg:inline">Entre para abrir o seu estúdio.</span>
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
