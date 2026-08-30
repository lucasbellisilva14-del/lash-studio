import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";

/** Placeholder padrão de módulo da Fase 2. */
export function Phase2Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <PageHeader title={title} backHref="/mais" />
      <Card>
        <CardBody className="text-center py-10">
          <p className="font-medium text-ink">Chegando na Fase 2</p>
          <p className="text-sm text-ink-soft mt-1.5 max-w-72 mx-auto">{description}</p>
        </CardBody>
      </Card>
    </div>
  );
}
