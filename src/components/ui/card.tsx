import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-surface rounded-[22px] shadow-[var(--shadow-card)] ring-1 ring-[rgb(23_21_30/0.04)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 sm:p-5", className)} {...props} />;
}

/** Faixa de título do cartão: nome da seção, para que serve e uma ação. */
export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-t-[22px] border-b border-line bg-surface-muted px-4 py-4 sm:px-5",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[16px] font-bold tracking-[-0.015em] text-ink">{title}</h2>
        {description ? <p className="mt-0.5 text-[13px] text-ink-soft">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
