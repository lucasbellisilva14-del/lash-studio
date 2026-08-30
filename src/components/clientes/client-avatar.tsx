import { cn } from "@/lib/cn";

/** "Ana Paula Souza" → "AS" */
export function clientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return (first + last).toUpperCase();
}

/** Avatar com iniciais no tom do acento — usado na lista e no perfil. */
export function ClientAvatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex items-center justify-center rounded-full bg-accent-soft text-accent-strong font-display font-semibold shrink-0 select-none",
        size === "lg" ? "w-14 h-14 text-xl" : "w-10 h-10 text-sm",
        className,
      )}
    >
      {clientInitials(name)}
    </span>
  );
}
