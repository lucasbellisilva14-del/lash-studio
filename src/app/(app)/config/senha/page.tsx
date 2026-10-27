import { requireViewer } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { SenhaForm } from "./senha-form";

export const metadata = { title: "Senha de acesso" };

/** A dona e a funcionária trocam aqui a própria senha. */
export default async function SenhaPage() {
  await requireViewer();

  return (
    <div>
      <PageHeader
        title="Senha de acesso"
        subtitle="Troque a senha do seu login quando quiser"
        backHref="/config"
      />
      <SenhaForm />
    </div>
  );
}
