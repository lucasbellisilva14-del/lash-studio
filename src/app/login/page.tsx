import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <div className="min-h-dvh flex flex-col justify-center px-6 py-10 bg-background bg-[radial-gradient(80%_50%_at_50%_0%,color-mix(in_srgb,var(--accent)_14%,transparent),transparent)]">
      <div className="mx-auto w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="mx-auto mb-4 h-16 w-16 rounded-3xl bg-accent-gradient shadow-lg shadow-accent/25 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="#f7f6f3" strokeWidth="1.9" strokeLinecap="round" className="w-9 h-9">
              <path d="M4 9c2.5 3.5 13.5 3.5 16 0" />
              <path d="M6 11.2 4.8 13M9.2 12.4l-.7 2M12 12.8v2.1M14.8 12.4l.7 2M18 11.2l1.2 1.8" />
            </svg>
          </div>
          <h1 className="font-display text-3xl font-semibold text-ink">LashOS</h1>
          <p className="text-sm text-ink-soft mt-1.5">
            Seu estúdio inteiro, no seu celular.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
