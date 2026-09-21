import { RecuperarForm } from "./recuperar-form";

export const metadata = { title: "Recuperar senha" };

export default function RecuperarPage() {
  return (
    <div className="min-h-dvh flex flex-col justify-center px-6 py-10 bg-background bg-[radial-gradient(80%_50%_at_50%_0%,color-mix(in_srgb,var(--accent)_14%,transparent),transparent)]">
      <div className="mx-auto w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-semibold text-ink">Esqueceu a senha?</h1>
          <p className="text-sm text-ink-soft mt-1.5">
            Acontece! Te enviamos um link por e-mail pra criar uma nova.
          </p>
        </div>
        <RecuperarForm />
      </div>
    </div>
  );
}
