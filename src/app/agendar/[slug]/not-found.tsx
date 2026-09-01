/** Link público com slug inexistente — 404 amigável, sem vazar nada. */
export default function AgendarNotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-surface-sunken">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          className="h-8 w-8 text-ink-faint"
        >
          <path d="M4 9c2.5 3.5 13.5 3.5 16 0" />
          <path d="M6 11.2 4.8 13M9.2 12.4l-.7 2M12 12.8v2.1M14.8 12.4l.7 2M18 11.2l1.2 1.8" />
        </svg>
      </div>
      <h1 className="mt-5 font-display text-2xl font-semibold text-ink">
        Estúdio não encontrado
      </h1>
      <p className="mx-auto mt-2 max-w-xs text-sm text-ink-soft">
        Esse link de agendamento não existe ou mudou. Confira o endereço com o
        estúdio e tente de novo.
      </p>
    </div>
  );
}
