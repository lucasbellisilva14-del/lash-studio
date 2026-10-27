import { RedefinirForm } from "./redefinir-form";

export const metadata = { title: "Nova senha" };

export default async function RedefinirPage(props: PageProps<"/login/redefinir/[token]">) {
  const { token } = await props.params;

  return (
    <div className="min-h-dvh flex flex-col justify-center px-6 py-10 bg-background">
      <div className="mx-auto w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold tracking-[-0.03em] text-ink">Criar nova senha</h1>
          <p className="text-sm text-ink-soft mt-1.5">
            Escolha uma senha nova para a sua conta.
          </p>
        </div>
        <RedefinirForm token={token} />
      </div>
    </div>
  );
}
