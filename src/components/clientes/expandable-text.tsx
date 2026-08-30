"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/** Texto truncado com "Ver mais / Ver menos" (corpo de mensagens na linha do tempo). */
export function ExpandableText({
  text,
  limit = 140,
  className,
}: {
  text: string;
  limit?: number;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const needsToggle = text.length > limit;
  const shown = expanded || !needsToggle ? text : `${text.slice(0, limit).trimEnd()}…`;

  return (
    <div className={className}>
      <p className="text-sm text-ink-soft whitespace-pre-line break-words">{shown}</p>
      {needsToggle ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs font-medium text-accent-strong"
        >
          {expanded ? "Ver menos" : "Ver mais"}
        </button>
      ) : null}
    </div>
  );
}
