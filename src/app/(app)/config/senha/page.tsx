import { PageHeader } from "@/components/ui/page-header";
import { SenhaForm } from "./senha-form";

export const metadata = { title: "Senha de acesso" };

export default function SenhaPage() {
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
