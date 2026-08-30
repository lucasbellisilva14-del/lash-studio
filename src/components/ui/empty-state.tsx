import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      {icon ? <div className="text-ink-faint mb-3 [&_svg]:w-8 [&_svg]:h-8">{icon}</div> : null}
      <p className="font-medium text-ink">{title}</p>
      {description ? <p className="text-sm text-ink-soft mt-1 max-w-64">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
